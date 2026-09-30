import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CalendarPlusIcon, CheckIcon, MapPinIcon } from "lucide-react"
import { currentUser } from "@/auth"
import { BookingStatusBadge, CalendarLinks, CancelBookingDialog } from "@/components/booking-item"
import { BookingSummary } from "@/components/booking-summary"
import { PhoneItem } from "@/components/phone-item"
import { PushOptIn } from "@/components/push-opt-in"
import { TenantHeader } from "@/components/tenant-chrome"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toBookingCard } from "@/lib/booking/view"
import { env } from "@/lib/env"
import { loadBooking } from "@/lib/notifications"
import { getTenantByRouteKey, tenantBasePath } from "@/lib/tenancy/tenant"

export default async function BookingDetailPage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant: key, id } = await params
  const tenant = await getTenantByRouteKey(key)
  if (!tenant) {
    notFound()
  }
  const basePath = await tenantBasePath(tenant)
  const user = await currentUser()
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`${basePath}/reserva/${id}`)}`)
  }
  const booking = await loadBooking(id)
  if (!booking || booking.tenantId !== tenant.id || booking.customer.userId !== user.id) {
    notFound()
  }
  const card = toBookingCard(booking)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tenant.name} ${tenant.address}`)}`

  return (
    <>
      <TenantHeader tenant={tenant} basePath={basePath} />
      <main className="mx-auto max-w-lg space-y-6 px-5 py-8">
        {card.isUpcoming ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_40px] shadow-primary/40">
              <CheckIcon className="size-8" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-bold">Reserva confirmada!</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos os detalhes para <b className="text-foreground">{booking.customer.user.email}</b>.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <BookingStatusBadge booking={card} />
            <h1 className="text-2xl font-bold">Detalhes da reserva</h1>
          </div>
        )}

        <BookingSummary
          data={{
            serviceName: card.serviceName,
            price: card.price,
            startsAt: card.startsAt,
            timeZone: card.timeZone,
            barberName: card.barberName,
            barbershopName: card.barbershop.name,
          }}
        />

        {card.isUpcoming && (
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="section-title flex items-center gap-2">
                  <CalendarPlusIcon className="size-4" /> Salvar na agenda
                </p>
                <CalendarLinks calendar={card.calendar} />
              </div>
              <div className="space-y-2">
                <p className="section-title mb-0">Lembretes</p>
                <p className="text-sm text-muted-foreground">Você recebe um lembrete por e-mail um dia antes.</p>
                <PushOptIn vapidPublicKey={env.vapidPublicKey} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-3">
            {tenant.address && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                <MapPinIcon className="size-[18px] text-primary" /> {tenant.address}
              </a>
            )}
            {tenant.phones.map((phone) => (
              <PhoneItem key={phone} phone={phone} />
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`${basePath}/agendamentos`}>Meus agendamentos</Link>
          </Button>
          {card.canCancel && <CancelBookingDialog bookingId={card.id} className="flex-1" />}
        </div>
        {card.isUpcoming && !card.canCancel && (
          <p className="text-center text-xs text-muted-foreground">
            Cancelamento online só até {card.minCancelHours}h antes. Fale com a barbearia.
          </p>
        )}
      </main>
    </>
  )
}
