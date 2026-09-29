import type { Tenant } from "@prisma/client"
import { env } from "@/lib/env"
import { sessionCookieDomain } from "./host"

/**
 * Link público que a barbearia divulga: domínio próprio, subdomínio
 * `<slug>.<raiz>` ou, em dev/localhost, `<APP_URL>/t/<slug>`.
 */
export function tenantPublicUrlFor(tenant: Pick<Tenant, "slug" | "customDomain">): string {
  if (tenant.customDomain) {
    return `https://${tenant.customDomain}`
  }
  if (sessionCookieDomain(env.rootDomain)) {
    const protocol = new URL(env.appUrl).protocol
    return `${protocol}//${tenant.slug}.${env.rootDomain}`
  }
  return `${env.appUrl}/t/${tenant.slug}`
}
