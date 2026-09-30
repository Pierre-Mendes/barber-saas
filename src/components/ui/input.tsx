import * as React from "react"
import { cn } from "@/lib/utils"

const fieldClass =
  "w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClass, "h-10 py-2", props.type === "color" && "p-1", className)} {...props} />
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-20 py-2", className)} {...props} />
}

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(fieldClass, "h-10 py-2", className)} {...props} />
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-xs font-semibold text-muted-foreground", className)} {...props} />
}

export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
