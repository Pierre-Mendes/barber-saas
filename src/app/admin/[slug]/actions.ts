"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import type { Role } from "@prisma/client"
import { canManageBarberSchedule, requirePanel, type PanelContext } from "@/lib/auth/guards"
import { assignableRoles, can, canManageMember } from "@/lib/auth/permissions"
import { BookingError, cancelBooking, createBooking, isPrismaUniqueViolation, setBookingOutcome } from "@/lib/booking/service"
import { db } from "@/lib/db"
import { notifyBookingCancelled, notifyBookingConfirmed } from "@/lib/notifications"
import { hhmmToMinutes, zonedToUtc } from "@/lib/scheduling/time"
import { isValidSlug } from "@/lib/tenancy/host"

/** Volta para a página com uma mensagem (`?erro=` ou `?ok=`) exibida pelo painel. */
function back(path: string, kind: "erro" | "ok", message: string): never {
  const separator = path.includes("?") ? "&" : "?"
  redirect(`${path}${separator}${kind}=${encodeURIComponent(message)}`)
}

/** URL absoluta ou caminho local (ex.: arte de demonstração em /demo/...). */
const imageRef = z.union([z.url(), z.string().regex(/^\/[\w\-./]+$/), z.literal("")])

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim()
}

/** Barbeiro só age na própria agenda; retorna o filtro a aplicar. */
function ownBarberScope(ctx: PanelContext): string | undefined {
  return can(ctx.membership.role, "bookings.manageAll") ? undefined : ctx.ownBarber?.id
}

// ─── Agenda ──────────────────────────────────────────────────────────────────

export async function staffCancelBooking(slug: string, bookingId: string, returnTo: string) {
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  try {
    await cancelBooking(bookingId, { kind: "staff", tenantId: ctx.tenant.id, barberId: ownBarberScope(ctx) })
  } catch (error) {
    if (error instanceof BookingError) {
      back(returnTo, "erro", error.message)
    }
    throw error
  }
  after(() => notifyBookingCancelled(bookingId))
  revalidatePath(`/admin/${slug}`)
}

export async function staffSetOutcome(slug: string, bookingId: string, status: "COMPLETED" | "NO_SHOW", returnTo: string) {
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  try {
    await setBookingOutcome(bookingId, status, { tenantId: ctx.tenant.id, barberId: ownBarberScope(ctx) })
  } catch (error) {
    if (error instanceof BookingError) {
      back(returnTo, "erro", error.message)
    }
    throw error
  }
  revalidatePath(`/admin/${slug}`)
}

const staffBookingSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  phone: z.string().max(30),
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
})

/** Recepção/equipe agenda para um cliente (telefone, balcão). O cliente recebe e-mail normalmente. */
export async function staffCreateBooking(slug: string, formData: FormData) {
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  const returnTo = `/admin/${slug}?data=${text(formData, "date")}`
  const parsed = staffBookingSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email").toLowerCase(),
    phone: text(formData, "phone"),
    serviceId: text(formData, "serviceId"),
    barberId: text(formData, "barberId"),
    date: text(formData, "date"),
    time: text(formData, "time"),
  })
  if (!parsed.success) {
    back(returnTo, "erro", "Preencha todos os campos do agendamento.")
  }
  const input = parsed.data
  if (!canManageBarberSchedule(ctx, input.barberId) && !can(ctx.membership.role, "bookings.manageAll")) {
    back(returnTo, "erro", "Você só pode agendar na sua agenda.")
  }
  const user = await db.user.upsert({
    where: { email: input.email },
    create: { email: input.email, name: input.name, phone: input.phone || null },
    update: {},
  })
  let bookingId: string
  try {
    const booking = await createBooking({
      tenantId: ctx.tenant.id,
      userId: user.id,
      barberId: input.barberId,
      serviceId: input.serviceId,
      startsAt: zonedToUtc(input.date, hhmmToMinutes(input.time), ctx.tenant.timezone),
      customerName: input.name,
      customerPhone: input.phone || null,
    })
    bookingId = booking.id
  } catch (error) {
    if (error instanceof BookingError) {
      back(returnTo, "erro", error.message)
    }
    throw error
  }
  after(() => notifyBookingConfirmed(bookingId))
  back(returnTo, "ok", "Agendamento criado e cliente notificado.")
}

// ─── Serviços ────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300),
  price: z.coerce.number().min(0).max(100000),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  imageUrl: imageRef,
})

function parseService(formData: FormData) {
  return serviceSchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
    price: text(formData, "price").replace(",", "."),
    durationMinutes: text(formData, "durationMinutes"),
    imageUrl: text(formData, "imageUrl"),
  })
}

export async function createService(slug: string, formData: FormData) {
  const ctx = await requirePanel(slug, "services.manage")
  const parsed = parseService(formData)
  if (!parsed.success) {
    back(`/admin/${slug}/services`, "erro", "Dados do serviço inválidos.")
  }
  const service = await db.service.create({
    data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null, tenantId: ctx.tenant.id },
  })
  // Por padrão, todos os barbeiros ativos fazem o novo serviço.
  const barbers = await db.barber.findMany({ where: { tenantId: ctx.tenant.id, active: true }, select: { id: true } })
  await db.barberService.createMany({ data: barbers.map((b) => ({ barberId: b.id, serviceId: service.id })) })
  back(`/admin/${slug}/services`, "ok", "Serviço criado.")
}

export async function updateService(slug: string, serviceId: string, formData: FormData) {
  const ctx = await requirePanel(slug, "services.manage")
  const parsed = parseService(formData)
  if (!parsed.success) {
    back(`/admin/${slug}/services`, "erro", "Dados do serviço inválidos.")
  }
  await db.service.updateMany({
    where: { id: serviceId, tenantId: ctx.tenant.id },
    data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null, active: formData.get("active") === "on" },
  })
  back(`/admin/${slug}/services`, "ok", "Serviço atualizado.")
}

// ─── Barbeiros ───────────────────────────────────────────────────────────────

export async function createBarber(slug: string, formData: FormData) {
  const ctx = await requirePanel(slug, "barbers.manage")
  const name = text(formData, "name")
  if (name.length < 2) {
    back(`/admin/${slug}/barbers`, "erro", "Informe o nome do barbeiro.")
  }
  const services = await db.service.findMany({ where: { tenantId: ctx.tenant.id, active: true }, select: { id: true } })
  const barber = await db.barber.create({
    data: {
      tenantId: ctx.tenant.id,
      name,
      services: { create: services.map((s) => ({ serviceId: s.id })) },
      workingHours: {
        create: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1140 })),
      },
    },
  })
  redirect(`/admin/${slug}/barbers/${barber.id}?ok=${encodeURIComponent("Barbeiro criado. Ajuste os horários.")}`)
}

async function requireBarber(ctx: PanelContext, barberId: string) {
  const barber = await db.barber.findFirst({ where: { id: barberId, tenantId: ctx.tenant.id } })
  if (!barber) {
    back(`/admin/${ctx.tenant.slug}/barbers`, "erro", "Barbeiro não encontrado.")
  }
  return barber
}

export async function updateBarberProfile(slug: string, barberId: string, formData: FormData) {
  const ctx = await requirePanel(slug, "barbers.manage")
  await requireBarber(ctx, barberId)
  const path = `/admin/${slug}/barbers/${barberId}`
  const photoUrl = text(formData, "photoUrl")
  if (!imageRef.safeParse(photoUrl).success) {
    back(path, "erro", "URL da foto inválida.")
  }
  const userId = text(formData, "userId") || null
  if (userId) {
    const isMember = await db.membership.count({ where: { tenantId: ctx.tenant.id, userId } })
    if (!isMember) {
      back(path, "erro", "Usuário não faz parte da equipe.")
    }
  }
  const serviceIds = formData.getAll("serviceIds").map(String)
  const validServices = await db.service.findMany({
    where: { tenantId: ctx.tenant.id, id: { in: serviceIds } },
    select: { id: true },
  })
  try {
    await db.$transaction([
      db.barber.update({
        where: { id: barberId },
        data: {
          name: text(formData, "name") || undefined,
          bio: text(formData, "bio"),
          photoUrl: photoUrl || null,
          active: formData.get("active") === "on",
          userId,
        },
      }),
      db.barberService.deleteMany({ where: { barberId } }),
      db.barberService.createMany({ data: validServices.map((s) => ({ barberId, serviceId: s.id })) }),
    ])
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      back(path, "erro", "Esse usuário já está vinculado a outro barbeiro.")
    }
    throw error
  }
  back(path, "ok", "Barbeiro atualizado.")
}

/** Recebe, por dia da semana, até dois blocos (manhã/tarde) no formato HH:MM. */
export async function updateWorkingHours(slug: string, barberId: string, formData: FormData) {
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  await requireBarber(ctx, barberId)
  const path = `/admin/${slug}/barbers/${barberId}`
  if (!canManageBarberSchedule(ctx, barberId)) {
    back(path, "erro", "Você só pode alterar a sua agenda.")
  }
  const blocks: { barberId: string; weekday: number; startMinute: number; endMinute: number }[] = []
  try {
    for (let weekday = 0; weekday < 7; weekday++) {
      if (formData.get(`d${weekday}.on`) !== "on") {
        continue
      }
      for (const part of ["a", "b"]) {
        const start = text(formData, `d${weekday}.${part}.start`)
        const end = text(formData, `d${weekday}.${part}.end`)
        if (!start || !end) {
          continue
        }
        const startMinute = hhmmToMinutes(start)
        const endMinute = hhmmToMinutes(end)
        if (endMinute <= startMinute) {
          throw new Error("O fim precisa ser depois do início.")
        }
        blocks.push({ barberId, weekday, startMinute, endMinute })
      }
    }
  } catch (error) {
    back(path, "erro", error instanceof Error ? error.message : "Horário inválido.")
  }
  await db.$transaction([
    db.workingHours.deleteMany({ where: { barberId } }),
    db.workingHours.createMany({ data: blocks }),
  ])
  back(path, "ok", "Horários salvos.")
}

export async function addTimeOff(slug: string, barberId: string, formData: FormData) {
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  await requireBarber(ctx, barberId)
  const path = `/admin/${slug}/barbers/${barberId}`
  if (!canManageBarberSchedule(ctx, barberId)) {
    back(path, "erro", "Você só pode alterar a sua agenda.")
  }
  const startDate = text(formData, "startDate")
  const endDate = text(formData, "endDate") || startDate
  const startTime = text(formData, "startTime") || "00:00"
  const endTime = text(formData, "endTime") || "23:59"
  let startsAt: Date
  let endsAt: Date
  try {
    startsAt = zonedToUtc(startDate, hhmmToMinutes(startTime), ctx.tenant.timezone)
    endsAt = zonedToUtc(endDate, hhmmToMinutes(endTime), ctx.tenant.timezone)
  } catch {
    back(path, "erro", "Datas inválidas.")
  }
  if (endsAt <= startsAt) {
    back(path, "erro", "O fim da folga precisa ser depois do início.")
  }
  await db.timeOff.create({ data: { barberId, startsAt, endsAt, reason: text(formData, "reason") } })
  back(path, "ok", "Folga registrada. Agendamentos já existentes nesse período não foram cancelados.")
}

export async function removeTimeOff(slug: string, barberId: string, timeOffId: string) {
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  await requireBarber(ctx, barberId)
  if (!canManageBarberSchedule(ctx, barberId)) {
    back(`/admin/${slug}/barbers/${barberId}`, "erro", "Você só pode alterar a sua agenda.")
  }
  await db.timeOff.deleteMany({ where: { id: timeOffId, barberId } })
  revalidatePath(`/admin/${slug}/barbers/${barberId}`)
}

// ─── Equipe ──────────────────────────────────────────────────────────────────

const roleSchema = z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "BARBER"])

export async function inviteMember(slug: string, formData: FormData) {
  const ctx = await requirePanel(slug, "team.manage")
  const path = `/admin/${slug}/team`
  const email = z.email().safeParse(text(formData, "email").toLowerCase())
  const role = roleSchema.safeParse(text(formData, "role"))
  if (!email.success || !role.success) {
    back(path, "erro", "E-mail ou papel inválido.")
  }
  if (!assignableRoles(ctx.membership.role).includes(role.data)) {
    back(path, "erro", "Você não pode atribuir esse papel.")
  }
  const user = await db.user.upsert({
    where: { email: email.data },
    create: { email: email.data, name: text(formData, "name") || null },
    update: {},
  })
  try {
    await db.membership.create({ data: { tenantId: ctx.tenant.id, userId: user.id, role: role.data } })
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      back(path, "erro", "Essa pessoa já faz parte da equipe.")
    }
    throw error
  }
  back(path, "ok", `Acesso liberado. ${email.data} entra no painel com o próprio e-mail.`)
}

export async function changeMemberRole(slug: string, membershipId: string, formData: FormData) {
  const ctx = await requirePanel(slug, "team.manage")
  const path = `/admin/${slug}/team`
  const role = roleSchema.safeParse(text(formData, "role"))
  const target = await db.membership.findFirst({ where: { id: membershipId, tenantId: ctx.tenant.id } })
  if (!role.success || !target) {
    back(path, "erro", "Membro ou papel inválido.")
  }
  if (!canManageMember(ctx.membership.role, target.role) || !assignableRoles(ctx.membership.role).includes(role.data)) {
    back(path, "erro", "Você não pode fazer essa alteração.")
  }
  await ensureAnotherOwner(ctx, target.id, target.role, role.data)
  await db.membership.update({ where: { id: target.id }, data: { role: role.data } })
  back(path, "ok", "Papel atualizado.")
}

export async function removeMember(slug: string, membershipId: string) {
  const ctx = await requirePanel(slug, "team.manage")
  const path = `/admin/${slug}/team`
  const target = await db.membership.findFirst({ where: { id: membershipId, tenantId: ctx.tenant.id } })
  if (!target || !canManageMember(ctx.membership.role, target.role)) {
    back(path, "erro", "Você não pode remover esse membro.")
  }
  await ensureAnotherOwner(ctx, target.id, target.role, null)
  await db.$transaction([
    db.barber.updateMany({ where: { tenantId: ctx.tenant.id, userId: target.userId }, data: { userId: null } }),
    db.membership.delete({ where: { id: target.id } }),
  ])
  back(path, "ok", "Membro removido.")
}

/** A barbearia nunca pode ficar sem dono. */
async function ensureAnotherOwner(ctx: PanelContext, membershipId: string, currentRole: Role, nextRole: Role | null) {
  if (currentRole !== "OWNER" || nextRole === "OWNER") {
    return
  }
  const owners = await db.membership.count({
    where: { tenantId: ctx.tenant.id, role: "OWNER", id: { not: membershipId } },
  })
  if (owners === 0) {
    back(`/admin/${ctx.tenant.slug}/team`, "erro", "A barbearia precisa de pelo menos um dono.")
  }
}

// ─── Configurações / personalização ─────────────────────────────────────────

const settingsSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().toLowerCase().refine(isValidSlug, "Link inválido ou reservado."),
  customDomain: z.union([
    z.string().toLowerCase().regex(/^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/, "Domínio inválido."),
    z.literal(""),
  ]),
  description: z.string().max(1000),
  address: z.string().max(200),
  phones: z.string().max(200),
  logoUrl: imageRef,
  bannerUrl: imageRef,
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("pt-BR", { timeZone: tz })
      return true
    } catch {
      return false
    }
  }, "Fuso inválido."),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
  minBookingLeadMin: z.coerce.number().int().min(0).max(10080),
  minCancelHours: z.coerce.number().int().min(0).max(168),
  bookingWindowDays: z.coerce.number().int().min(1).max(180),
})

export async function updateSettings(slug: string, formData: FormData) {
  const ctx = await requirePanel(slug, "settings.manage")
  const path = `/admin/${slug}/settings`
  const parsed = settingsSchema.safeParse(Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v).trim()])))
  if (!parsed.success) {
    back(path, "erro", parsed.error.issues[0]?.message ?? "Dados inválidos.")
  }
  const data = parsed.data
  try {
    await db.tenant.update({
      where: { id: ctx.tenant.id },
      data: {
        ...data,
        customDomain: data.customDomain || null,
        logoUrl: data.logoUrl || null,
        bannerUrl: data.bannerUrl || null,
        phones: data.phones.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean),
      },
    })
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      back(path, "erro", "Link ou domínio já em uso por outra conta.")
    }
    throw error
  }
  back(`/admin/${data.slug}/settings`, "ok", "Configurações salvas.")
}
