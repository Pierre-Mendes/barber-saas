import type { BookingStatus } from "@prisma/client"
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
  minCancelHours: number
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

export function toBookingCard(booking: LoadedBooking, now: Date = new Date()): BookingCardData {
  const isUpcoming = booking.status === "CONFIRMED" && booking.endsAt > now
  const event = bookingCalendarEvent(booking)
  return {
    id: booking.id,
    status: booking.status,
    isUpcoming,
    canCancel: isUpcoming && booking.startsAt.getTime() - booking.tenant.minCancelHours * 3_600_000 > now.getTime(),
    minCancelHours: booking.tenant.minCancelHours,
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
      ics: `/api/bookings/${booking.id}/ics`,
    },
  }
}
