import Link from "next/link"
import { BarbershopItem } from "@/components/barbershop-item"
import { QuickSearch } from "@/components/quick-search"
import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth/guards"
import { findCategory } from "@/lib/catalog"
import { getMarketplaceShops } from "@/lib/marketplace/queries"
import type { MarketplaceSort } from "@/lib/marketplace/ranking"
import { cn } from "@/lib/utils"

export const metadata = { title: "Barbearias" }

/**
 * Busca/vitrine para clientes com conta (equivalente ao /barbershops do projeto base):
 * favoritas no topo e ordenação por atendimentos concluídos.
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; servico?: string; ordem?: string }>
}) {
  const user = await requireUser("/explore")
  const { q = "", servico, ordem } = await searchParams
  const sort: MarketplaceSort = ordem === "minhas" ? "mine" : "popular"
  const category = findCategory(servico)
  const shops = await getMarketplaceShops(user.id, { q, category: servico, sort })

  const sortLink = (value: string) => {
    const params = new URLSearchParams()
    if (q) {
      params.set("q", q)
    }
    if (servico) {
      params.set("servico", servico)
    }
    if (value) {
      params.set("ordem", value)
    }
    return `/explore?${params.toString()}`
  }
  const heading = q ? `Resultados para "${q}"` : category ? category.title : "Todas as barbearias"

  return (
    <div className="space-y-6">
      <SearchBar defaultValue={q} />
      <QuickSearch active={servico} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title mb-0">
          {heading} · {shops.length}
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className={cn(sort === "popular" && "bg-primary text-primary-foreground hover:bg-primary")} asChild>
            <Link href={sortLink("")}>Mais atendimentos</Link>
          </Button>
          <Button size="sm" variant="secondary" className={cn(sort === "mine" && "bg-primary text-primary-foreground hover:bg-primary")} asChild>
            <Link href={sortLink("minhas")}>Onde eu mais fui</Link>
          </Button>
        </div>
      </div>

      {shops.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">Nenhuma barbearia encontrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {shops.map((shop) => (
            <BarbershopItem key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  )
}
