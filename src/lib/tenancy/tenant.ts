import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import type { Tenant } from "@prisma/client"
import { db } from "@/lib/db"

export const TENANT_REWRITE_HEADER = "x-tenant-rewrite"

/** Busca a barbearia pela chave da rota interna (`slug` ou `~dominio`). */
export const getTenantByRouteKey = cache(async (key: string): Promise<Tenant | null> => {
  const decoded = decodeURIComponent(key)
  const tenant = decoded.startsWith("~")
    ? await db.tenant.findUnique({ where: { customDomain: decoded.slice(1) } })
    : await db.tenant.findUnique({ where: { slug: decoded } })
  return tenant?.active ? tenant : null
})

/**
 * Prefixo dos links dentro da página da barbearia. Vazio quando acessada pelo
 * subdomínio/domínio próprio (o middleware reescreveu a URL), `/t/<slug>` caso contrário.
 */
export async function tenantBasePath(tenant: Pick<Tenant, "slug">): Promise<string> {
  const requestHeaders = await headers()
  return requestHeaders.get(TENANT_REWRITE_HEADER) ? "" : `/t/${tenant.slug}`
}
