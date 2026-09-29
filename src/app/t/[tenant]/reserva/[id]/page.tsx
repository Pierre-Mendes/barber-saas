import { notFound, redirect } from "next/navigation"
import { currentUser } from "@/auth"
import { BookingStatusBadge } from "@/components/booking-status-badge"
import { CalendarButtons } from "@/components/calendar-buttons"
import { CancelBookingButton } from "@/components/cancel-booking-button"
import { PushOptIn } from "@/components/push-opt-in"
import { env } from "@/lib/env"
import { bookingCalendarEvent, loadBooking } from "@/lib/notifications"
import { formatDateTime } from "@/lib/scheduling/time"
import { getTenantByRouteKey, tenantBasePath } from "@/lib/tenancy/tenant"

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export default async function BookingDetailPage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant: key, id } = await params
  const tenant = await getTenantByRouteKey(key)
  if (!tenant) {
    notFound()
  }
  const base = await tenantBasePath(tenant)
  const user = await currentUser()
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`${base}/reserva/${id}`)}`)
  }
  const booking = await loadBooking(id)
  if (!booking || booking.tenantId !== tenant.id || booking.customer.userId !== user.id) {
    notFound()
  }
  const isUpcoming = booking.status === "CONFIRMED" && booking.endsAt > new Date()

  return (
    <div className="space-y-6">
      <div className="card space-y-2">
        <BookingStatusBadge status={booking.status} />
        <h1 className="text-xl font-bold">{booking.service.name}</h1>
        <p className="text-sm">com {booking.barber.name}</p>
        <p className="text-sm first-letter:uppercase">{formatDateTime(booking.startsAt, tenant.timezone)}</p>
        <p className="text-sm text-muted">
          {currency.format(Number(booking.price))} • {booking.service.durationMinutes} min
        </p>
        {tenant.address && <p className="text-sm text-muted">📍 {tenant.address}</p>}
      </div>

      {isUpcoming && (
        <>
          <section className="space-y-2">
            <h2 className="label">Adicionar à sua agenda</h2>
            <CalendarButtons event={bookingCalendarEvent(booking)} icsUrl={`/api/bookings/${booking.id}/ics`} />
          </section>
          <section className="space-y-2">
            <h2 className="label">Lembretes</h2>
            <p className="text-sm text-muted">Você recebe a confirmação e um lembrete por e-mail.</p>
            <PushOptIn vapidPublicKey={env.vapidPublicKey} />
          </section>
          <section>
            <p className="mb-2 text-xs text-muted">
              Cancelamento online até {tenant.minCancelHours}h antes do horário.
            </p>
            <CancelBookingButton bookingId={booking.id} />
          </section>
        </>
      )}
    </div>
  )
}
