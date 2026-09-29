"use client"

import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText = "Salvando…",
}: {
  children: React.ReactNode
  className?: string
  pendingText?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  )
}
