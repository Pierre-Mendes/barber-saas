import type { BookingStatus, CancellationPolicy } from "@prisma/client"

/** Regras de cancelamento online da barbearia (campos do `Tenant`). */
export interface CancellationRules {
  cancellationPolicy: CancellationPolicy
  minCancelHours: number
  cancelWindowMinutes: number
}

interface BookingTimes {
  createdAt: Date
  startsAt: Date
}

/**
 * Até quando o cliente pode cancelar pela internet; `null` = não pode (só falando com a barbearia).
 * Nunca passa do início do atendimento.
 */
export function cancellationDeadline(rules: CancellationRules, booking: BookingTimes): Date | null {
  switch (rules.cancellationPolicy) {
    case "NONE":
      return null
    case "HOURS_BEFORE_START":
      return new Date(booking.startsAt.getTime() - rules.minCancelHours * 3_600_000)
    case "WINDOW_AFTER_BOOKING":
      return new Date(Math.min(booking.createdAt.getTime() + rules.cancelWindowMinutes * 60_000, booking.startsAt.getTime()))
  }
}

export function canCustomerCancel(
  rules: CancellationRules,
  booking: BookingTimes & { status: BookingStatus },
  now: Date = new Date(),
): boolean {
  if (booking.status !== "CONFIRMED" || now >= booking.startsAt) {
    return false
  }
  const deadline = cancellationDeadline(rules, booking)
  return deadline !== null && now <= deadline
}

/** Frase curta para o cliente (página da reserva, e-mail) e para o painel. */
export function describeCancellationPolicy(rules: CancellationRules): string {
  switch (rules.cancellationPolicy) {
    case "NONE":
      return "Cancelamento só falando com a barbearia."
    case "HOURS_BEFORE_START":
      return rules.minCancelHours === 0
        ? "Você pode cancelar online até o horário marcado."
        : `Você pode cancelar online até ${rules.minCancelHours}h antes do horário.`
    case "WINDOW_AFTER_BOOKING":
      return `Você pode cancelar online em até ${formatMinutes(rules.cancelWindowMinutes)} depois de agendar.`
  }
}

function formatMinutes(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? "1 hora" : `${hours} horas`
  }
  return `${minutes} minutos`
}
