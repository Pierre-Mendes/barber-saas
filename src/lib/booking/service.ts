import { randomBytes } from "node:crypto"
import { Prisma, type Booking, type BookingStatus } from "@prisma/client"
import { cached, getVersion } from "@/lib/cache"
import { cacheKeys, invalidateSchedule, TTL, VERSION } from "@/lib/cache/keys"
import { db } from "@/lib/db"
import { computeAvailableSlots } from "@/lib/scheduling/availability"
import { addDays, localDayBounds, toLocalDate } from "@/lib/scheduling/time"
import { canCustomerCancel, describeCancellationPolicy } from "./policy"

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "SLOT_UNAVAILABLE"
      | "SLOT_TAKEN"
      | "OUT_OF_WINDOW"
      | "CANCEL_TOO_LATE"
      | "FORBIDDEN"
      | "INVALID_STATUS",
  ) {
    super(message)
    this.name = "BookingError"
  }
}

const ACTIVE_STATUSES: BookingStatus[] = ["CONFIRMED", "COMPLETED"]

interface AvailabilityQuery {
  tenantId: string
  barberId: string
  serviceId: string
  /** Dia local (YYYY-MM-DD) no fuso da barbearia. */
  date: string
  now?: Date
  /** Ignora este agendamento no cálculo (útil para remarcação). */
  ignoreBookingId?: string
  /** Ignora o cache (validação na hora de gravar). */
  fresh?: boolean
}

/**
 * Horários livres de um barbeiro para um serviço em um dia.
 * Consultas "ao vivo" (sem `now` fixo) usam cache curto, invalidado a cada mudança de agenda;
 * a gravação sempre revalida com `fresh: true`.
 */
export async function getAvailableSlots(query: AvailabilityQuery): Promise<Date[]> {
  if (query.fresh || query.now || query.ignoreBookingId) {
    return computeSlots(query)
  }
  const version = await getVersion(VERSION.schedule(query.tenantId))
  const cacheKey = cacheKeys.slots(query.tenantId, version, query.barberId, query.serviceId, query.date)
  return cached(cacheKey, TTL.slots, () => computeSlots(query))
}

async function computeSlots(query: AvailabilityQuery): Promise<Date[]> {
  const now = query.now ?? new Date()
  const [tenant, barber, service] = await Promise.all([
    db.tenant.findUnique({ where: { id: query.tenantId } }),
    db.barber.findFirst({
      where: {
        id: query.barberId,
        tenantId: query.tenantId,
        active: true,
        services: { some: { serviceId: query.serviceId } },
      },
      include: { workingHours: true },
    }),
    db.service.findFirst({ where: { id: query.serviceId, tenantId: query.tenantId, active: true } }),
  ])
  if (!tenant || !barber || !service) {
    return []
  }

  const today = toLocalDate(now, tenant.timezone)
  const lastDay = addDays(today, tenant.bookingWindowDays)
  if (query.date < today || query.date > lastDay) {
    return []
  }

  const { start, end } = localDayBounds(query.date, tenant.timezone)
  const [bookings, timeOff] = await Promise.all([
    db.booking.findMany({
      where: {
        barberId: barber.id,
        status: { in: ACTIVE_STATUSES },
        startsAt: { lt: end },
        endsAt: { gt: start },
        ...(query.ignoreBookingId ? { id: { not: query.ignoreBookingId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
    db.timeOff.findMany({
      where: { barberId: barber.id, startsAt: { lt: end }, endsAt: { gt: start } },
      select: { startsAt: true, endsAt: true },
    }),
  ])

  return computeAvailableSlots({
    date: query.date,
    timeZone: tenant.timezone,
    durationMinutes: service.durationMinutes,
    slotIntervalMinutes: tenant.slotIntervalMinutes,
    workingHours: barber.workingHours,
    busy: [...bookings, ...timeOff],
    now,
    minLeadMinutes: tenant.minBookingLeadMin,
  })
}

/** Quem está agendando: usuário logado ou visitante sem conta (identificado pelo e-mail). */
export type BookingCustomer =
  | { kind: "user"; userId: string; email: string; name: string; phone?: string | null }
  | { kind: "guest"; email: string; name: string; phone?: string | null }

interface CreateBookingInput {
  tenantId: string
  customer: BookingCustomer
  barberId: string
  serviceId: string
  startsAt: Date
  notes?: string
  now?: Date
}

/**
 * Registro do cliente na barbearia (por conta ou, sem conta, por e-mail). Duas reservas
 * simultâneas do mesmo cliente novo podem disputar a criação: quem perde (P2002) tenta de novo
 * e encontra o registro criado pelo outro.
 */
async function findOrCreateCustomer(tenantId: string, input: BookingCustomer) {
  const email = input.email.trim().toLowerCase()
  const phone = input.phone || null
  for (let attempt = 0; ; attempt++) {
    try {
      return await upsertCustomer(tenantId, input, email, phone)
    } catch (error) {
      if (!isPrismaUniqueViolation(error) || attempt > 0) {
        throw error
      }
    }
  }
}

async function upsertCustomer(tenantId: string, input: BookingCustomer, email: string, phone: string | null) {
  if (input.kind === "user") {
    const own = await db.customer.findUnique({ where: { tenantId_userId: { tenantId, userId: input.userId } } })
    if (own) {
      return own.email && !phone ? own : db.customer.update({ where: { id: own.id }, data: { email: own.email ?? email, ...(phone ? { phone } : {}) } })
    }
    // Já tinha agendado sem conta com este e-mail: o registro passa a ser da conta.
    const guest = await db.customer.findUnique({ where: { tenantId_email: { tenantId, email } } })
    if (guest && !guest.userId) {
      return db.customer.update({ where: { id: guest.id }, data: { userId: input.userId, ...(phone ? { phone } : {}) } })
    }
    return db.customer.create({ data: { tenantId, userId: input.userId, email, name: input.name, phone } })
  }
  const existing = await db.customer.findUnique({ where: { tenantId_email: { tenantId, email } } })
  if (existing) {
    return phone ? db.customer.update({ where: { id: existing.id }, data: { phone } }) : existing
  }
  return db.customer.create({ data: { tenantId, email, name: input.name, phone } })
}

/**
 * Liga à conta os registros de cliente criados sem conta com o mesmo e-mail (todas as barbearias).
 * Chamado no login, só quando o e-mail é comprovado.
 */
export async function linkGuestCustomers(userId: string, email: string): Promise<number> {
  const result = await db.customer.updateMany({
    where: { email: email.trim().toLowerCase(), userId: null },
    data: { userId },
  })
  return result.count
}

/** Segredo do link "ver ou cancelar" do e-mail (192 bits). */
export function newAccessToken(): string {
  return randomBytes(24).toString("base64url")
}

function isOverlapViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("booking_no_overlap") || message.includes("23P01")
}

/**
 * Cria um agendamento validando serviço, barbeiro e disponibilidade.
 * A constraint `booking_no_overlap` no banco resolve a corrida entre dois clientes.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const tenant = await db.tenant.findUnique({ where: { id: input.tenantId } })
  const service = await db.service.findFirst({
    where: { id: input.serviceId, tenantId: input.tenantId, active: true },
  })
  if (!tenant || !tenant.active || !service) {
    throw new BookingError("Serviço não encontrado.", "NOT_FOUND")
  }

  const localDate = toLocalDate(input.startsAt, tenant.timezone)
  const slots = await getAvailableSlots({
    tenantId: tenant.id,
    barberId: input.barberId,
    serviceId: service.id,
    date: localDate,
    now: input.now,
    fresh: true,
  })
  if (!slots.some((slot) => slot.getTime() === input.startsAt.getTime())) {
    throw new BookingError("Esse horário não está mais disponível.", "SLOT_UNAVAILABLE")
  }

  const customer = await findOrCreateCustomer(tenant.id, input.customer)

  try {
    const booking = await db.booking.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        barberId: input.barberId,
        serviceId: service.id,
        startsAt: input.startsAt,
        endsAt: new Date(input.startsAt.getTime() + service.durationMinutes * 60_000),
        price: service.price,
        notes: input.notes ?? "",
        accessToken: newAccessToken(),
      },
    })
    await invalidateSchedule(tenant.id)
    return booking
  } catch (error) {
    if (isOverlapViolation(error)) {
      // O cache mostrou um horário que outra pessoa acabou de pegar: força recálculo.
      await invalidateSchedule(tenant.id)
      throw new BookingError("Alguém acabou de reservar esse horário. Escolha outro.", "SLOT_TAKEN")
    }
    throw error
  }
}

type CancelActor =
  | { kind: "customer"; userId: string }
  /** Visitante sem conta, com o segredo do link enviado por e-mail. */
  | { kind: "token"; token: string }
  | { kind: "staff"; tenantId: string; barberId?: string }

/**
 * Cancela um agendamento. Cliente (com conta ou pelo link) respeita a política de cancelamento
 * da barbearia; equipe pode cancelar a qualquer momento (barbeiro só os próprios).
 */
export async function cancelBooking(bookingId: string, actor: CancelActor, now: Date = new Date()): Promise<Booking> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, tenant: true },
  })
  if (!booking) {
    throw new BookingError("Agendamento não encontrado.", "NOT_FOUND")
  }

  if (actor.kind === "customer" || actor.kind === "token") {
    const owns =
      actor.kind === "customer"
        ? booking.customer.userId === actor.userId
        : Boolean(booking.accessToken) && booking.accessToken === actor.token
    if (!owns) {
      throw new BookingError("Agendamento não encontrado.", "NOT_FOUND")
    }
    if (booking.status === "CONFIRMED" && !canCustomerCancel(booking.tenant, booking, now)) {
      throw new BookingError(
        `${describeCancellationPolicy(booking.tenant)} Esse prazo já passou: fale com a barbearia.`,
        "CANCEL_TOO_LATE",
      )
    }
  } else {
    if (booking.tenantId !== actor.tenantId) {
      throw new BookingError("Agendamento não encontrado.", "NOT_FOUND")
    }
    if (actor.barberId && booking.barberId !== actor.barberId) {
      throw new BookingError("Você só pode alterar a sua agenda.", "FORBIDDEN")
    }
  }

  if (booking.status !== "CONFIRMED") {
    throw new BookingError("Esse agendamento não pode mais ser cancelado.", "INVALID_STATUS")
  }

  const cancelled = await db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: now },
  })
  await invalidateSchedule(booking.tenantId)
  return cancelled
}

/** Equipe marca atendimento como concluído ou falta. */
export async function setBookingOutcome(
  bookingId: string,
  status: Extract<BookingStatus, "COMPLETED" | "NO_SHOW">,
  actor: { tenantId: string; barberId?: string },
): Promise<Booking> {
  const booking = await db.booking.findFirst({ where: { id: bookingId, tenantId: actor.tenantId } })
  if (!booking) {
    throw new BookingError("Agendamento não encontrado.", "NOT_FOUND")
  }
  if (actor.barberId && booking.barberId !== actor.barberId) {
    throw new BookingError("Você só pode alterar a sua agenda.", "FORBIDDEN")
  }
  if (booking.status === "CANCELLED") {
    throw new BookingError("Agendamento cancelado.", "INVALID_STATUS")
  }
  return db.booking.update({ where: { id: booking.id }, data: { status } })
}

export function isPrismaUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}
