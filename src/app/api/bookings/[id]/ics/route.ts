import { NextResponse } from "next/server"
import { currentUser } from "@/auth"
import { db } from "@/lib/db"
import { buildIcs } from "@/lib/calendar/ics"
import { bookingCalendarEvent, loadBooking } from "@/lib/notifications"

/** Download do .ics — só o próprio cliente ou alguém da equipe da barbearia. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const booking = await loadBooking(id)
  if (!booking) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }
  const isCustomer = booking.customer.userId === user.id
  const isStaff =
    !isCustomer &&
    (await db.membership.count({ where: { tenantId: booking.tenantId, userId: user.id } })) > 0
  if (!isCustomer && !isStaff) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }
  return new NextResponse(buildIcs(bookingCalendarEvent(booking)), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamento-${booking.id}.ics"`,
    },
  })
}
