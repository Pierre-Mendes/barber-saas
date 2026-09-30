import { describe, expect, it } from "vitest"
import { buildIcs, googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from "@/lib/calendar/ics"
import { rankBarbershops } from "@/lib/marketplace/ranking"
import { bookingConfirmedEmail } from "@/lib/notifications/templates"

const event: CalendarEvent = {
  uid: "booking-1@barber-saas",
  title: "Corte; barba, e sobrancelha",
  description: "Linha 1\nLinha 2",
  location: "Rua A, 10",
  startsAt: new Date("2026-10-05T12:00:00Z"),
  endsAt: new Date("2026-10-05T12:45:00Z"),
  url: "https://zebu.barber.app/reserva/1",
}

describe("calendar", () => {
  it("builds a valid, escaped iCalendar event with a reminder alarm", () => {
    const ics = buildIcs(event, new Date("2026-10-01T00:00:00Z"))
    expect(ics).toContain("DTSTART:20261005T120000Z\r\n")
    expect(ics).toContain("DTEND:20261005T124500Z\r\n")
    expect(ics).toContain("SUMMARY:Corte\\; barba\\, e sobrancelha\r\n")
    expect(ics).toContain("DESCRIPTION:Linha 1\\nLinha 2\r\n")
    expect(ics).toContain("BEGIN:VALARM")
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true)
  })

  it("marks cancelled events so calendars remove them", () => {
    const ics = buildIcs({ ...event, cancelled: true, sequence: 1 })
    expect(ics).toContain("METHOD:CANCEL")
    expect(ics).toContain("STATUS:CANCELLED")
    expect(ics).not.toContain("VALARM")
  })

  it("generates Google and Outlook add-to-calendar links", () => {
    const google = new URL(googleCalendarUrl(event))
    expect(google.searchParams.get("dates")).toBe("20261005T120000Z/20261005T124500Z")
    expect(google.searchParams.get("action")).toBe("TEMPLATE")
    const outlook = new URL(outlookCalendarUrl(event))
    expect(outlook.searchParams.get("startdt")).toBe("2026-10-05T12:00:00.000Z")
  })

  it("escapes user-provided data in e-mails", () => {
    const email = bookingConfirmedEmail({
      tenantName: "<script>x</script>",
      primaryColor: "#000",
      timeZone: "America/Sao_Paulo",
      customerName: "Ana",
      barberName: "Zé",
      serviceName: "Corte",
      price: "R$ 50,00",
      address: "Rua A",
      startsAt: event.startsAt,
      manageUrl: "https://x/reserva/1",
      event,
    })
    expect(email.html).not.toContain("<script>")
    expect(email.html).toContain("&lt;script&gt;")
  })
})

describe("rankBarbershops", () => {
  const shops = [
    { id: "a", name: "Alfa", isFavorite: false, completedCount: 50, myCompletedCount: 0 },
    { id: "b", name: "Beta", isFavorite: true, completedCount: 2, myCompletedCount: 1 },
    { id: "c", name: "Gama", isFavorite: false, completedCount: 90, myCompletedCount: 3 },
    { id: "d", name: "Delta", isFavorite: true, completedCount: 10, myCompletedCount: 0 },
  ]

  it("puts favorites on top, then sorts by completed services", () => {
    expect(rankBarbershops(shops).map((s) => s.id)).toEqual(["d", "b", "c", "a"])
  })

  it("can sort by the user's own history", () => {
    expect(rankBarbershops(shops, "mine").map((s) => s.id)).toEqual(["b", "d", "c", "a"])
  })
})
