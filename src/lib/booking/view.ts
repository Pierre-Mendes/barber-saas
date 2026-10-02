import type { BookingStatus } from "@prisma/client"
import { cancellationDeadline, canCustomerCancel, describeCancellationPolicy } from "@/lib/booking/policy"
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar/ics"
import { tenantFallbackCover } from "@/lib/catalog"
import { bookingCalendarEvent, type LoadedBooking } from "@/lib/notifications"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"
import { formatCurrency } from "@/lib/utils"

/** Dados serializáveis de um agendamento para os componentes do cliente. */
export interface BookingCardData {
  id: string
  status: BookingStatus
  isUpcoming: boolean
  canCancel: boolean
  /** Até quando o cliente pode cancelar online (ISO), se a barbearia permitir. */
  cancelDeadline: string | null
  /** Política de cancelamento em uma frase. */
  cancellationText: string
  serviceName: string
  price: string
  startsAt: string
  timeZone: string
  barberName: string
  barbershop: {
    name: string
    address: string
    logoUrl: string | null
    coverUrl: string
    phones: string[]
    url: string
  }
  calendar: { google: string; outlook: string; ics: string }
}

export const bookingCardInclude = {
  tenant: true,
  service: true,
  barber: { include: { user: true } },
  customer: { include: { user: true } },
} as const

/**
 * `accessToken`: quando a página foi aberta pelo link do e-mail (sem login), os links de
 * download/cancelamento levam o segredo junto.
 */
export function toBookingCard(booking: LoadedBooking, now: Date = new Date(), accessToken?: string): BookingCardData {
  const isUpcoming = booking.status === "CONFIRMED" && booking.endsAt > now
  const event = bookingCalendarEvent(booking)
  return {
    id: booking.id,
    status: booking.status,
    isUpcoming,
    canCancel: isUpcoming && canCustomerCancel(booking.tenant, booking, now),
    cancelDeadline: cancellationDeadline(booking.tenant, booking)?.toISOString() ?? null,
    cancellationText: describeCancellationPolicy(booking.tenant),
    serviceName: booking.service.name,
    price: formatCurrency(booking.price),
    startsAt: booking.startsAt.toISOString(),
    timeZone: booking.tenant.timezone,
    barberName: booking.barber.name,
    barbershop: {
      name: booking.tenant.name,
      address: booking.tenant.address,
      logoUrl: booking.tenant.logoUrl,
      coverUrl: booking.tenant.bannerUrl ?? tenantFallbackCover(booking.tenant.id),
      phones: booking.tenant.phones,
      url: tenantPublicUrlFor(booking.tenant),
    },
    calendar: {
      google: googleCalendarUrl(event),
      outlook: outlookCalendarUrl(event),
      ics: `/api/bookings/${booking.id}/ics${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ""}`,
    },
  }
}
