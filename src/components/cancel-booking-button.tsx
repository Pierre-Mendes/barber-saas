"use client"

import { useState, useTransition } from "react"
import { cancelMyBookingAction } from "@/app/actions/customer"

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <button
        type="button"
        className="btn-danger"
        disabled={pending}
        onClick={() => {
          if (!confirm("Cancelar este agendamento?")) {
            return
          }
          startTransition(async () => {
            const result = await cancelMyBookingAction(bookingId)
            setError(result.ok ? null : (result.error ?? "Erro ao cancelar."))
            if (result.ok) {
              window.location.reload()
            }
          })
        }}
      >
        {pending ? "Cancelando…" : "Cancelar"}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  )
}
