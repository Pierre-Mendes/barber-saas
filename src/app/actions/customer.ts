"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"
import { clientIp, currentUser } from "@/auth"
import { bumpVersion } from "@/lib/cache"
import { VERSION } from "@/lib/cache/keys"
import { RATE_LIMITS, rateLimit } from "@/lib/cache/rate-limit"
import { db } from "@/lib/db"
import { BookingError, cancelBooking, createBooking, getAvailableSlots } from "@/lib/booking/service"
import { notifyBookingCancelled, notifyBookingConfirmed } from "@/lib/notifications"

export async function toggleFavoriteAction(tenantId: string): Promise<void> {
  const user = await currentUser()
  if (!user) {
    return
  }
  const key = { userId_tenantId: { userId: user.id, tenantId } }
  const existing = await db.favorite.findUnique({ where: key })
  if (existing) {
    await db.favorite.delete({ where: key })
  } else {
    await db.favorite.create({ data: { userId: user.id, tenantId } })
  }
  await bumpVersion(VERSION.userMarketplace(user.id))
  revalidatePath("/")
  revalidatePath("/explore")
}

const slotsSchema = z.object({
  tenantId: z.string().min(1),
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/** Horários livres (ISO) para o assistente de agendamento. Público: não expõe dados de clientes. */
export async function getSlotsAction(input: z.infer<typeof slotsSchema>): Promise<string[]> {
  const parsed = slotsSchema.safeParse(input)
  if (!parsed.success) {
    return []
  }
  const slots = await getAvailableSlots(parsed.data)
  return slots.map((slot) => slot.toISOString())
}

const createSchema = z.object({
  tenantId: z.string().min(1),
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  startsAt: z.iso.datetime(),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(500).optional(),
  /** Só para quem agenda sem conta. */
  guest: z
    .object({
      name: z.string().trim().min(2, "Informe seu nome.").max(80),
      email: z.email("Informe um e-mail válido.").transform((email) => email.toLowerCase()),
    })
    .optional(),
})

export type CreateBookingInput = z.input<typeof createSchema>

export type CreateBookingResult =
  | { ok: true; bookingId: string; manageToken?: string }
  | { ok: false; error: string; needsGuestInfo?: boolean }

/** Reserva com conta ou sem conta (nome + e-mail). Quem agenda sem conta recebe o link de gestão por e-mail. */
export async function createBookingAction(input: CreateBookingInput): Promise<CreateBookingResult> {
  const user = await currentUser()
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }
  const { guest, phone, ...data } = parsed.data
  if (!user && !guest) {
    return { ok: false, error: "Informe seu nome e e-mail para confirmar.", needsGuestInfo: true }
  }

  const limits = [rateLimit("booking", user?.id ?? guest!.email, RATE_LIMITS.booking)]
  if (!user) {
    limits.push(rateLimit("booking:guest-ip", clientIp(await headers()), RATE_LIMITS.guestBookingIp))
  }
  if ((await Promise.all(limits)).some((limit) => !limit.ok)) {
    return { ok: false, error: "Muitas tentativas de reserva. Aguarde alguns minutos." }
  }

  try {
    const booking = await createBooking({
      ...data,
      startsAt: new Date(data.startsAt),
      customer: user
        ? { kind: "user", userId: user.id, email: user.email ?? "", name: user.name || user.email?.split("@")[0] || "Cliente", phone }
        : { kind: "guest", email: guest!.email, name: guest!.name, phone },
    })
    after(() => notifyBookingConfirmed(booking.id))
    revalidatePath("/bookings")
    return { ok: true, bookingId: booking.id, manageToken: user ? undefined : (booking.accessToken ?? undefined) }
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message }
    }
    throw error
  }
}

/** Cancela pelo login ou, sem conta, pelo segredo do link enviado por e-mail. */
export async function cancelMyBookingAction(bookingId: string, token?: string): Promise<{ ok: boolean; error?: string }> {
  const user = token ? null : await currentUser()
  if (!token && !user) {
    return { ok: false, error: "Não autenticado." }
  }
  try {
    const booking = await cancelBooking(bookingId, token ? { kind: "token", token } : { kind: "customer", userId: user!.id })
    after(() => notifyBookingCancelled(booking.id))
    revalidatePath("/bookings")
    return { ok: true }
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message }
    }
    throw error
  }
}
