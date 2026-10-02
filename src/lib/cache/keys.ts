import type { Tenant } from "@prisma/client"
import { bumpVersion, invalidate, key } from "./index"

/** Tempos de vida (segundos). Curtos o bastante para dispensar invalidação fina em dados pouco críticos. */
export const TTL = {
  tenant: 300,
  slots: 60,
  marketplace: 120,
} as const

/** Grupos versionados. */
export const VERSION = {
  schedule: (tenantId: string) => `schedule:${tenantId}`,
  marketplace: "marketplace",
  userMarketplace: (userId: string) => `marketplace:user:${userId}`,
}

/**
 * Versão do formato do `Tenant` guardado no cache. Suba quando o modelo ganhar campos:
 * entradas antigas (sem os campos novos) deixam de ser lidas após o deploy.
 */
const TENANT_SHAPE = 2

export const cacheKeys = {
  tenantByRouteKey: (routeKey: string) => key("tenant", `v${TENANT_SHAPE}`, routeKey),
  slots: (tenantId: string, version: number, barberId: string, serviceId: string, date: string) =>
    key("slots", tenantId, version, barberId, serviceId, date),
  marketplace: (version: number, userVersion: number, userId: string, filters: string) =>
    key("mkt", version, userVersion, userId, filters),
}

/** Mudou algo que afeta horários livres (agendamento, expediente, folga, serviço, barbeiro, regras). */
export async function invalidateSchedule(tenantId: string): Promise<void> {
  await bumpVersion(VERSION.schedule(tenantId))
}

/** Mudou a barbearia (nome, slug, domínio, cor…): limpa a busca por host/slug e a vitrine. */
export async function invalidateTenant(...tenants: Pick<Tenant, "id" | "slug" | "customDomain">[]): Promise<void> {
  const routeKeys = tenants.flatMap((tenant) => [
    cacheKeys.tenantByRouteKey(tenant.slug),
    ...(tenant.customDomain ? [cacheKeys.tenantByRouteKey(`~${tenant.customDomain}`)] : []),
  ])
  await Promise.all([
    invalidate(...routeKeys),
    bumpVersion(VERSION.marketplace, ...tenants.map((tenant) => VERSION.schedule(tenant.id))),
  ])
}
