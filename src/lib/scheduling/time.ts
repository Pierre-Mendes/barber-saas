/**
 * Utilitários de fuso horário sem dependências externas.
 * Um "dia local" é representado como string `YYYY-MM-DD` no fuso da barbearia.
 */

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    })
    formatterCache.set(timeZone, formatter)
  }
  return formatter
}

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: number
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts: Record<string, string> = {}
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    parts[part.type] = part.value
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday] ?? 0,
  }
}

/** Diferença (ms) entre o horário local no fuso e UTC no instante informado. */
function offsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

export function parseLocalDate(localDate: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)
  if (!match) {
    throw new Error(`Data inválida: ${localDate}`)
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** Converte "dia local + minutos desde meia-noite" no fuso para um instante UTC. */
export function zonedToUtc(localDate: string, minutesFromMidnight: number, timeZone: string): Date {
  const { year, month, day } = parseLocalDate(localDate)
  const guess = Date.UTC(year, month - 1, day, 0, minutesFromMidnight)
  const firstOffset = offsetMs(new Date(guess), timeZone)
  let result = guess - firstOffset
  const secondOffset = offsetMs(new Date(result), timeZone)
  if (secondOffset !== firstOffset) {
    result = guess - secondOffset
  }
  return new Date(result)
}

export function toLocalDate(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
}

export function addDays(localDate: string, days: number): string {
  const { year, month, day } = parseLocalDate(localDate)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function weekdayOf(localDate: string): number {
  const { year, month, day } = parseLocalDate(localDate)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** Intervalo UTC [início, fim) que cobre o dia local inteiro. */
export function localDayBounds(localDate: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: zonedToUtc(localDate, 0, timeZone),
    end: zonedToUtc(addDays(localDate, 1), 0, timeZone),
  }
}

export function minutesToHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

export function hhmmToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) {
    throw new Error(`Horário inválido: ${value}`)
  }
  return Number(match[1]) * 60 + Number(match[2])
}

export function formatDateTime(date: Date, timeZone: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
    ...options,
  }).format(date)
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date)
}

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
