import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { CalendarXIcon } from "lucide-react"
import { BookingItem } from "@/components/booking-item"
import { PushOptIn } from "@/components/push-opt-in"
import { Button } from "@/components/ui/button"
import { bookingCardInclude, toBookingCard } from "@/lib/booking/view"
import { db } from "@/lib/db"
import { env } from "@/lib/env"

/** Lista "Confirmados / Finalizados" do cliente, com filtro opcional por barbearia. */
export async function BookingsSections({
  where,
  emptyHref,
  emptyLabel,
}: {
  where: Prisma.BookingWhereInput
  emptyHref: string
  emptyLabel: string
}) {
  const now = new Date()
  const bookings = await db.booking.findMany({
    where,
    include: bookingCardInclude,
    orderBy: { startsAt: "desc" },
    take: 100,
  })
  const cards = bookings.map((booking) => toBookingCard(booking, now))
  const confirmed = cards.filter((b) => b.isUpcoming).reverse()
  const finished = cards.filter((b) => !b.isUpcoming)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Agendamentos</h1>
        <PushOptIn vapidPublicKey={env.vapidPublicKey} />
      </div>

      {cards.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <CalendarXIcon className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">Você ainda não tem agendamentos.</p>
          <Button asChild>
            <Link href={emptyHref}>{emptyLabel}</Link>
          </Button>
        </div>
      )}

      {confirmed.length > 0 && (
        <section>
          <h2 className="section-title">Confirmados</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {confirmed.map((booking) => (
              <BookingItem key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="section-title">Finalizados</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {finished.map((booking) => (
              <BookingItem key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
