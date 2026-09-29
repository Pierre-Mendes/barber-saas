import { Prisma, type Booking, type BookingStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { computeAvailableSlots } from "@/lib/scheduling/availability"
import { addDays, localDayBounds, toLocalDate } from "@/lib/scheduling/time"

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
}

/** Horários livres de um barbeiro para um serviço em um dia. */
export async function getAvailableSlots(query: AvailabilityQuery): Promise<Date[]> {
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

interface CreateBookingInput {
  tenantId: string
  userId: string
  barberId: string
  serviceId: string
  startsAt: Date
  customerName: string
  customerPhone?: string | null
  notes?: string
  now?: Date
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
  })
  if (!slots.some((slot) => slot.getTime() === input.startsAt.getTime())) {
    throw new BookingError("Esse horário não está mais disponível.", "SLOT_UNAVAILABLE")
  }

  const customer = await db.customer.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: input.userId } },
    create: {
      tenantId: tenant.id,
      userId: input.userId,
      name: input.customerName,
      phone: input.customerPhone ?? null,
    },
    update: input.customerPhone ? { phone: input.customerPhone } : {},
  })

  try {
    return await db.booking.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        barberId: input.barberId,
        serviceId: service.id,
        startsAt: input.startsAt,
        endsAt: new Date(input.startsAt.getTime() + service.durationMinutes * 60_000),
        price: service.price,
        notes: input.notes ?? "",
      },
    })
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new BookingError("Alguém acabou de reservar esse horário. Escolha outro.", "SLOT_TAKEN")
    }
    throw error
  }
}

type CancelActor = { kind: "customer"; userId: string } | { kind: "staff"; tenantId: string; barberId?: string }

/**
 * Cancela um agendamento. Cliente respeita a antecedência mínima da barbearia;
 * equipe pode cancelar a qualquer momento (barbeiro só os próprios).
 */
export async function cancelBooking(bookingId: string, actor: CancelActor, now: Date = new Date()): Promise<Booking> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, tenant: true },
  })
  if (!booking) {
    throw new BookingError("Agendamento não encontrado.", "NOT_FOUND")
  }

  if (actor.kind === "customer") {
    if (booking.customer.userId !== actor.userId) {
      throw new BookingError("Agendamento não encontrado.", "NOT_FOUND")
    }
    const limit = booking.startsAt.getTime() - booking.tenant.minCancelHours * 3_600_000
    if (now.getTime() > limit) {
      throw new BookingError(
        `Cancelamentos precisam ser feitos com ${booking.tenant.minCancelHours}h de antecedência. Fale com a barbearia.`,
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

  return db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: now },
  })
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
