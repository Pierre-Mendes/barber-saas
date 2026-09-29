import { weekdayOf, zonedToUtc } from "./time"

export interface TimeRange {
  startsAt: Date
  endsAt: Date
}

export interface WorkingBlock {
  weekday: number
  startMinute: number
  endMinute: number
}

export interface AvailabilityInput {
  /** Dia local no fuso da barbearia (YYYY-MM-DD). */
  date: string
  timeZone: string
  durationMinutes: number
  slotIntervalMinutes: number
  workingHours: WorkingBlock[]
  /** Agendamentos ativos e folgas do barbeiro que tocam o dia. */
  busy: TimeRange[]
  now: Date
  minLeadMinutes: number
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt
}

/**
 * Calcula os horários de início livres de um barbeiro em um dia:
 * expediente − folgas − agendamentos, fatiado pela duração do serviço.
 */
export function computeAvailableSlots(input: AvailabilityInput): Date[] {
  const weekday = weekdayOf(input.date)
  const earliest = input.now.getTime() + input.minLeadMinutes * 60_000
  const interval = Math.max(5, input.slotIntervalMinutes)
  const slots = new Map<number, Date>()

  for (const block of input.workingHours) {
    if (block.weekday !== weekday) {
      continue
    }
    for (
      let minute = block.startMinute;
      minute + input.durationMinutes <= block.endMinute;
      minute += interval
    ) {
      const candidate: TimeRange = {
        startsAt: zonedToUtc(input.date, minute, input.timeZone),
        endsAt: zonedToUtc(input.date, minute + input.durationMinutes, input.timeZone),
      }
      if (candidate.startsAt.getTime() < earliest) {
        continue
      }
      if (input.busy.some((range) => overlaps(candidate, range))) {
        continue
      }
      slots.set(candidate.startsAt.getTime(), candidate.startsAt)
    }
  }

  return [...slots.values()].sort((a, b) => a.getTime() - b.getTime())
}
