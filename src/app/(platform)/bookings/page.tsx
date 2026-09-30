import { BookingsSections } from "@/components/bookings-sections"
import { requireUser } from "@/lib/auth/guards"

export const metadata = { title: "Agendamentos" }

export default async function MyBookingsPage() {
  const user = await requireUser("/bookings")
  return (
    <BookingsSections
      where={{ customer: { userId: user.id } }}
      emptyHref="/explore"
      emptyLabel="Encontrar uma barbearia"
    />
  )
}
