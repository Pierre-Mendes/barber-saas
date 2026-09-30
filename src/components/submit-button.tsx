"use client"

import { useFormStatus } from "react-dom"
import { Button, type ButtonProps } from "@/components/ui/button"

export function SubmitButton({ children, pendingText = "Salvando…", ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingText : children}
    </Button>
  )
}
