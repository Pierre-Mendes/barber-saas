"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

/**
 * Mostra como toast o retorno das ações do servidor (`?ok=` / `?erro=`)
 * e limpa esses parâmetros da URL.
 */
export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!ok && !erro) {
      return
    }
    if (erro) {
      toast.error(erro)
    } else if (ok) {
      toast.success(ok)
    }
    const params = new URLSearchParams(searchParams.toString())
    params.delete("ok")
    params.delete("erro")
    params.delete("acesso")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [ok, erro, pathname, router, searchParams])

  return null
}

export type FlashParams = Promise<{ ok?: string; erro?: string }>
