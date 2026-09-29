export type MarketplaceSort = "popular" | "mine"

export interface RankableBarbershop {
  id: string
  name: string
  isFavorite: boolean
  /** Total de atendimentos concluídos na barbearia. */
  completedCount: number
  /** Atendimentos concluídos do usuário logado nessa barbearia. */
  myCompletedCount: number
}

/**
 * Ordena a vitrine do cliente: favoritas sempre no topo; dentro de cada grupo,
 * pelo critério escolhido (atendimentos totais ou do próprio usuário) e depois por nome.
 */
export function rankBarbershops<T extends RankableBarbershop>(items: T[], sort: MarketplaceSort = "popular"): T[] {
  const metric = (item: T): number => (sort === "mine" ? item.myCompletedCount : item.completedCount)
  return [...items].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) {
      return a.isFavorite ? -1 : 1
    }
    const diff = metric(b) - metric(a)
    if (diff !== 0) {
      return diff
    }
    return a.name.localeCompare(b.name, "pt-BR")
  })
}
