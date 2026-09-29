import { db } from "@/lib/db"
import { buildIcs, type CalendarEvent } from "@/lib/calendar/ics"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"
import { sendMail } from "./mailer"
import { sendPushToUser } from "./push"
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingPush,
  bookingReminderEmail,
  staffNewBookingEmail,
  type BookingMessageContext,
} from "./templates"

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export async function loadBooking(bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: {
      tenant: true,
      service: true,
      barber: { include: { user: true } },
      customer: { include: { user: true } },
    },
  })
}

export type LoadedBooking = NonNullable<Awaited<ReturnType<typeof loadBooking>>>

export function bookingCalendarEvent(booking: LoadedBooking): CalendarEvent {
  return {
    uid: `booking-${booking.id}@barber-saas`,
    title: `${booking.service.name} — ${booking.tenant.name}`,
    description: `${booking.service.name} com ${booking.barber.name}`,
    location: booking.tenant.address,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    url: bookingManageUrl(booking),
    sequence: booking.status === "CANCELLED" ? 1 : 0,
    cancelled: booking.status === "CANCELLED",
  }
}

export function bookingManageUrl(booking: Pick<LoadedBooking, "id" | "tenant">): string {
  return `${tenantPublicUrlFor(booking.tenant)}/reserva/${booking.id}`
}

function messageContext(booking: LoadedBooking): BookingMessageContext {
  return {
    tenantName: booking.tenant.name,
    primaryColor: booking.tenant.primaryColor,
    timeZone: booking.tenant.timezone,
    customerName: booking.customer.name,
    barberName: booking.barber.name,
    serviceName: booking.service.name,
    price: currency.format(Number(booking.price)),
    address: booking.tenant.address,
    startsAt: booking.startsAt,
    manageUrl: bookingManageUrl(booking),
    event: bookingCalendarEvent(booking),
  }
}

function icsAttachment(booking: LoadedBooking) {
  return {
    filename: "agendamento.ics",
    content: buildIcs(bookingCalendarEvent(booking)),
    contentType: `text/calendar; charset=utf-8; method=${booking.status === "CANCELLED" ? "CANCEL" : "PUBLISH"}`,
  }
}

/** Executa todas as entregas sem deixar uma falha derrubar as outras. */
async function deliverAll(tasks: Promise<unknown>[]): Promise<void> {
  const results = await Promise.allSettled(tasks)
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[notifications] falha na entrega", result.reason)
    }
  }
}

export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  const booking = await loadBooking(bookingId)
  if (!booking) {
    return
  }
  const ctx = messageContext(booking)
  const tasks: Promise<unknown>[] = [
    sendMail({ to: booking.customer.user.email, ...bookingConfirmedEmail(ctx), attachments: [icsAttachment(booking)] }),
    sendPushToUser(booking.customer.userId, bookingPush("confirmed", ctx)),
  ]
  if (booking.barber.user?.email) {
    tasks.push(
      sendMail({ to: booking.barber.user.email, ...staffNewBookingEmail(ctx), attachments: [icsAttachment(booking)] }),
      sendPushToUser(booking.barber.user.id, { ...bookingPush("confirmed", ctx), title: "Novo agendamento" }),
    )
  }
  await deliverAll(tasks)
}

export async function notifyBookingCancelled(bookingId: string): Promise<void> {
  const booking = await loadBooking(bookingId)
  if (!booking) {
    return
  }
  const ctx = messageContext(booking)
  const tasks: Promise<unknown>[] = [
    sendMail({ to: booking.customer.user.email, ...bookingCancelledEmail(ctx), attachments: [icsAttachment(booking)] }),
    sendPushToUser(booking.customer.userId, bookingPush("cancelled", ctx)),
  ]
  if (booking.barber.user) {
    tasks.push(sendPushToUser(booking.barber.user.id, bookingPush("cancelled", ctx)))
  }
  await deliverAll(tasks)
}

const REMINDER_WINDOW_MS = 24 * 3_600_000
/** Não envia lembrete para quem agendou pouco antes do horário. */
const MIN_GAP_AFTER_BOOKING_MS = 3 * 3_600_000

/**
 * Envia lembretes de agendamentos nas próximas 24h. Idempotente: marca
 * `reminderSentAt` antes de enviar, então execuções concorrentes não duplicam.
 */
export async function sendDueReminders(now: Date = new Date()): Promise<number> {
  const due = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startsAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
    },
    select: { id: true, createdAt: true, startsAt: true },
    take: 200,
  })

  let sent = 0
  for (const candidate of due) {
    const claimed = await db.booking.updateMany({
      where: { id: candidate.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    })
    if (claimed.count === 0) {
      continue
    }
    if (candidate.startsAt.getTime() - candidate.createdAt.getTime() < MIN_GAP_AFTER_BOOKING_MS) {
      continue
    }
    const booking = await loadBooking(candidate.id)
    if (!booking) {
      continue
    }
    const ctx = messageContext(booking)
    await deliverAll([
      sendMail({ to: booking.customer.user.email, ...bookingReminderEmail(ctx), attachments: [icsAttachment(booking)] }),
      sendPushToUser(booking.customer.userId, bookingPush("reminder", ctx)),
    ])
    sent++
  }
  return sent
}
