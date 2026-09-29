import Link from "next/link"
import { toggleFavoriteAction } from "@/app/actions/customer"
import { requireUser } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { rankBarbershops, type MarketplaceSort } from "@/lib/marketplace/ranking"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"

export const metadata = { title: "Barbearias" }

/**
 * Vitrine para clientes com conta: todas as barbearias listadas, favoritas no
 * topo e ordenação por atendimentos concluídos. As barbearias não veem esta tela.
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const user = await requireUser("/explore")
  const { q = "", sort: sortParam } = await searchParams
  const sort: MarketplaceSort = sortParam === "mine" ? "mine" : "popular"
  const term = q.trim()

  const tenants = await db.tenant.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ listedInMarketplace: true }, { favorites: { some: { userId: user.id } } }] },
        term
          ? {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { address: { contains: term, mode: "insensitive" } },
                { services: { some: { active: true, name: { contains: term, mode: "insensitive" } } } },
              ],
            }
          : {},
      ],
    },
    select: {
      id: true,
      slug: true,
      customDomain: true,
      name: true,
      address: true,
      logoUrl: true,
      bannerUrl: true,
      primaryColor: true,
      favorites: { where: { userId: user.id }, select: { userId: true } },
      _count: { select: { bookings: { where: { status: "COMPLETED" } } } },
    },
  })

  const mine = await db.booking.groupBy({
    by: ["tenantId"],
    where: { status: "COMPLETED", customer: { userId: user.id } },
    _count: { _all: true },
  })
  const myCounts = new Map(mine.map((row) => [row.tenantId, row._count._all]))

  const ranked = rankBarbershops(
    tenants.map((tenant) => ({
      ...tenant,
      isFavorite: tenant.favorites.length > 0,
      completedCount: tenant._count.bookings,
      myCompletedCount: myCounts.get(tenant.id) ?? 0,
    })),
    sort,
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Barbearias</h1>
          <p className="text-sm text-muted">Suas favoritas aparecem primeiro.</p>
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={term} placeholder="Buscar por nome, bairro ou serviço" className="input w-64" />
          <select name="sort" defaultValue={sort} className="input w-auto">
            <option value="popular">Mais atendimentos</option>
            <option value="mine">Onde eu mais fui</option>
          </select>
          <button className="btn-primary">Filtrar</button>
        </form>
      </div>

      {ranked.length === 0 && <p className="mt-10 text-center text-muted">Nenhuma barbearia encontrada.</p>}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map((tenant) => (
          <li key={tenant.id} className="card flex flex-col gap-3">
            <div
              className="h-28 rounded-lg bg-cover bg-center"
              style={{
                backgroundColor: tenant.primaryColor,
                backgroundImage: tenant.bannerUrl ? `url(${tenant.bannerUrl})` : undefined,
              }}
            />
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{tenant.name}</h2>
                <p className="text-xs text-muted">{tenant.address}</p>
              </div>
              <form action={toggleFavoriteAction.bind(null, tenant.id)}>
                <button
                  aria-label={tenant.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                  className="text-xl text-yellow-400"
                  title={tenant.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                >
                  {tenant.isFavorite ? "★" : "☆"}
                </button>
              </form>
            </div>
            <p className="text-xs text-muted">
              {tenant.completedCount} atendimentos
              {tenant.myCompletedCount > 0 && ` • você foi ${tenant.myCompletedCount}x`}
            </p>
            <Link href={tenantPublicUrlFor(tenant)} className="btn-primary mt-auto">
              Agendar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
