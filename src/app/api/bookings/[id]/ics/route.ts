import { NextResponse } from "next/server"
import { currentUser } from "@/auth"
import { db } from "@/lib/db"
import { buildIcs } from "@/lib/calendar/ics"
import { bookingCalendarEvent, loadBooking } from "@/lib/notifications"

/** Download do .ics — o próprio cliente (logado ou com o link `?token=` do e-mail) ou a equipe da barbearia. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = new URL(request.url).searchParams.get("token")
  const booking = await loadBooking(id)
  if (!booking) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }
  const hasToken = Boolean(token && booking.accessToken && token === booking.accessToken)
  const user = hasToken ? null : await currentUser()
  if (!hasToken && !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const isCustomer = hasToken || booking.customer.userId === user?.id
  const isStaff =
    !isCustomer &&
    (await db.membership.count({ where: { tenantId: booking.tenantId, userId: user!.id } })) > 0
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
