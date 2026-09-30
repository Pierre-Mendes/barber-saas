"use client"

import { SmartphoneIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function PhoneItem({ phone }: { phone: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SmartphoneIcon className="size-5" />
        <p className="text-sm">{phone}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          navigator.clipboard
            .writeText(phone)
            .then(() => toast.success("Telefone copiado!"))
            .catch(() => toast.error("Não foi possível copiar."))
        }}
      >
        Copiar
      </Button>
    </div>
  )
}
