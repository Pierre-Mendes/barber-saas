export interface CalendarEvent {
  uid: string
  title: string
  description: string
  location: string
  startsAt: Date
  endsAt: Date
  url?: string
  /** Incrementar a cada alteração; clientes de calendário usam para atualizar o evento. */
  sequence?: number
  cancelled?: boolean
}

function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

/** Quebra linhas com mais de 75 caracteres, conforme RFC 5545 §3.1. */
function fold(line: string): string {
  if (line.length <= 75) {
    return line
  }
  const chunks: string[] = []
  for (let i = 0; i < line.length; i += 74) {
    chunks.push(line.slice(i, i + 74))
  }
  return chunks.join("\r\n ")
}

/** Gera um arquivo .ics (iCalendar) compatível com Google, Apple e Outlook. */
export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//barber-saas//agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(event.startsAt)}`,
    `DTEND:${formatUtc(event.endsAt)}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
  ]
  if (event.url) {
    lines.push(`URL:${event.url}`)
  }
  if (!event.cancelled) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-PT1H",
      `DESCRIPTION:${escapeText(event.title)}`,
      "END:VALARM",
    )
  }
  lines.push("END:VEVENT", "END:VCALENDAR")
  return lines.map(fold).join("\r\n") + "\r\n"
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatUtc(event.startsAt)}/${formatUtc(event.endsAt)}`,
    details: event.url ? `${event.description}\n\n${event.url}` : event.description,
    location: event.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function outlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startsAt.toISOString(),
    enddt: event.endsAt.toISOString(),
    body: event.url ? `${event.description}\n\n${event.url}` : event.description,
    location: event.location,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
