"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const term = value.trim()
        router.push(term ? `/explore?q=${encodeURIComponent(term)}` : "/explore")
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Busque por barbearia, bairro ou serviço…"
        aria-label="Buscar"
      />
      <Button type="submit" size="icon" aria-label="Buscar">
        <SearchIcon />
      </Button>
    </form>
  )
}
