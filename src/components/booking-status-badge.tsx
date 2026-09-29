import type { BookingStatus } from "@prisma/client"

const STYLES: Record<BookingStatus, { label: string; className: string }> = {
  CONFIRMED: { label: "Confirmado", className: "bg-brand/20 text-brand" },
  COMPLETED: { label: "Concluído", className: "bg-emerald-900/50 text-emerald-300" },
  CANCELLED: { label: "Cancelado", className: "bg-red-900/40 text-red-300" },
  NO_SHOW: { label: "Não compareceu", className: "bg-amber-900/40 text-amber-300" },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const style = STYLES[status]
  return <span className={`badge ${style.className}`}>{style.label}</span>
}
