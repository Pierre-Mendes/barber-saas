import Link from "next/link"
import { BookingStatusBadge } from "@/components/booking-status-badge"
import { CancelBookingButton } from "@/components/cancel-booking-button"
import { PushOptIn } from "@/components/push-opt-in"
import { requireUser } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { formatDateTime } from "@/lib/scheduling/time"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"

export const metadata = { title: "Meus agendamentos" }

export default async function MyBookingsPage() {
  const user = await requireUser("/bookings")
  const now = new Date()
  const bookings = await db.booking.findMany({
    where: { customer: { userId: user.id } },
    include: { tenant: true, service: true, barber: true },
    orderBy: { startsAt: "desc" },
    take: 100,
  })
  const upcoming = bookings
    .filter((b) => b.status === "CONFIRMED" && b.endsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const past = bookings.filter((b) => !upcoming.includes(b))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Meus agendamentos</h1>
        <PushOptIn vapidPublicKey={env.vapidPublicKey} />
      </div>

      <section>
        <h2 className="label">Próximos</h2>
        {upcoming.length === 0 && (
          <p className="text-sm text-muted">
            Nada marcado. <Link href="/explore" className="text-brand">Encontre uma barbearia</Link>.
          </p>
        )}
        <ul className="space-y-3">
          {upcoming.map((booking) => (
            <li key={booking.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <BookingStatusBadge status={booking.status} />
                <p className="mt-1 font-semibold">
                  {booking.service.name} com {booking.barber.name}
                </p>
                <p className="text-sm text-muted">
                  {booking.tenant.name} • {formatDateTime(booking.startsAt, booking.tenant.timezone)}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={`${tenantPublicUrlFor(booking.tenant)}/reserva/${booking.id}`} className="btn-secondary">
                  Detalhes
                </a>
                <CancelBookingButton bookingId={booking.id} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="label">Histórico</h2>
        <ul className="space-y-2">
          {past.map((booking) => (
            <li key={booking.id} className="card flex items-center justify-between gap-4 text-sm">
              <span>
                {booking.tenant.name} — {booking.service.name} •{" "}
                {formatDateTime(booking.startsAt, booking.tenant.timezone, { dateStyle: "short" })}
              </span>
              <BookingStatusBadge status={booking.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
