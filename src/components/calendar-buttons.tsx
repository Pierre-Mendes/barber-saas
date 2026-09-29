import { googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from "@/lib/calendar/ics"

/** Botões "Adicionar à agenda": Google, Outlook e .ics (Apple Calendar e outros). */
export function CalendarButtons({ event, icsUrl }: { event: CalendarEvent; icsUrl: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a className="btn-secondary" href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
        Google Agenda
      </a>
      <a className="btn-secondary" href={outlookCalendarUrl(event)} target="_blank" rel="noreferrer">
        Outlook
      </a>
      <a className="btn-secondary" href={icsUrl}>
        Apple / outros (.ics)
      </a>
    </div>
  )
}
