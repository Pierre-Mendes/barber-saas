"use client"

import { PencilIcon, PlusIcon } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

/** Botão "+ Novo …" que abre um formulário (server action) em painel lateral. */
export function FormSheet({
  triggerLabel,
  title,
  description,
  children,
  edit,
  triggerVariant,
  triggerSize,
}: {
  triggerLabel: string
  /** Botão secundário com ícone de lápis (edição) em vez de "+". */
  edit?: boolean
  triggerVariant?: ButtonProps["variant"]
  triggerSize?: ButtonProps["size"]
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant={triggerVariant ?? (edit ? "secondary" : "default")} size={triggerSize ?? (edit ? "sm" : "default")}>
          {edit ? <PencilIcon /> : <PlusIcon />} {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="p-5">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
