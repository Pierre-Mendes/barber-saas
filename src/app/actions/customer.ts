"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { currentUser } from "@/auth"
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
})

export type CreateBookingResult = { ok: true; bookingId: string } | { ok: false; error: string; needsLogin?: boolean }

export async function createBookingAction(input: z.infer<typeof createSchema>): Promise<CreateBookingResult> {
  const user = await currentUser()
  if (!user) {
    return { ok: false, error: "Entre para confirmar o agendamento.", needsLogin: true }
  }
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." }
  }
  if (!(await rateLimit("booking", user.id, RATE_LIMITS.booking)).ok) {
    return { ok: false, error: "Muitas tentativas de reserva. Aguarde alguns minutos." }
  }
  try {
    const booking = await createBooking({
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      userId: user.id,
      customerName: user.name || user.email?.split("@")[0] || "Cliente",
      customerPhone: parsed.data.phone || null,
    })
    after(() => notifyBookingConfirmed(booking.id))
    revalidatePath("/bookings")
    return { ok: true, bookingId: booking.id }
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message }
    }
    throw error
  }
}

export async function cancelMyBookingAction(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser()
  if (!user) {
    return { ok: false, error: "Não autenticado." }
  }
  try {
    const booking = await cancelBooking(bookingId, { kind: "customer", userId: user.id })
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
