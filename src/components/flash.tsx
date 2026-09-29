/** Mensagem de retorno das ações do painel (`?ok=` / `?erro=`). */
export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (erro) {
    return <p className="mb-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{erro}</p>
  }
  if (ok) {
    return <p className="mb-4 rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{ok}</p>
  }
  return null
}

export type FlashParams = Promise<{ ok?: string; erro?: string }>
