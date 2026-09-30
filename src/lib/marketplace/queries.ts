import type { Prisma } from "@prisma/client"
import type { BarbershopCardData } from "@/components/barbershop-item"
import { cached, getVersion } from "@/lib/cache"
import { cacheKeys, TTL, VERSION } from "@/lib/cache/keys"
import { findCategory, tenantFallbackCover } from "@/lib/catalog"
import { db } from "@/lib/db"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"
import { rankBarbershops, type MarketplaceSort } from "./ranking"

export interface MarketplaceShop extends BarbershopCardData {
  myCompletedCount: number
}

interface Filters {
  q?: string
  category?: string
  sort?: MarketplaceSort
}

/**
 * Barbearias visíveis na vitrine de um cliente logado: as listadas e as que ele favoritou,
 * já ordenadas (favoritas no topo, depois por atendimentos concluídos).
 */
export async function getMarketplaceShops(userId: string, filters: Filters = {}): Promise<MarketplaceShop[]> {
  const [version, userVersion] = await Promise.all([
    getVersion(VERSION.marketplace),
    getVersion(VERSION.userMarketplace(userId)),
  ])
  const filterKey = JSON.stringify([filters.q?.trim().toLowerCase() ?? "", filters.category ?? "", filters.sort ?? "popular"])
  return cached(cacheKeys.marketplace(version, userVersion, userId, filterKey), TTL.marketplace, () =>
    loadMarketplaceShops(userId, filters),
  )
}

async function loadMarketplaceShops(userId: string, filters: Filters): Promise<MarketplaceShop[]> {
  const term = filters.q?.trim()
  const category = findCategory(filters.category)
  const conditions: Prisma.TenantWhereInput[] = [
    { OR: [{ listedInMarketplace: true }, { favorites: { some: { userId } } }] },
  ]
  if (term) {
    conditions.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { address: { contains: term, mode: "insensitive" } },
        { services: { some: { active: true, name: { contains: term, mode: "insensitive" } } } },
      ],
    })
  }
  if (category) {
    conditions.push({
      services: {
        some: { active: true, OR: category.keywords.map((keyword) => ({ name: { contains: keyword, mode: "insensitive" as const } })) },
      },
    })
  }

  const [tenants, mine] = await Promise.all([
    db.tenant.findMany({
      where: { active: true, AND: conditions },
      select: {
        id: true,
        slug: true,
        customDomain: true,
        name: true,
        address: true,
        bannerUrl: true,
        favorites: { where: { userId }, select: { userId: true } },
        _count: { select: { bookings: { where: { status: "COMPLETED" } } } },
      },
    }),
    db.booking.groupBy({
      by: ["tenantId"],
      where: { status: "COMPLETED", customer: { userId } },
      _count: { _all: true },
    }),
  ])
  const myCounts = new Map(mine.map((row) => [row.tenantId, row._count._all]))

  return rankBarbershops(
    tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      address: tenant.address,
      coverUrl: tenant.bannerUrl ?? tenantFallbackCover(tenant.id),
      url: tenantPublicUrlFor(tenant),
      isFavorite: tenant.favorites.length > 0,
      completedCount: tenant._count.bookings,
      myCompletedCount: myCounts.get(tenant.id) ?? 0,
    })),
    filters.sort,
  )
}
