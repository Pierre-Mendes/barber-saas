/**
 * Resolve qual "espaço" um host representa:
 * - plataforma (domínio raiz): marketplace, login, painel, onboarding
 * - subdomínio `<slug>.<raiz>`: página white-label da barbearia
 * - domínio próprio (qualquer outro host): página white-label via `customDomain`
 *
 * Roda no middleware (edge), então não pode acessar o banco.
 */

export type HostResolution =
  | { kind: "platform" }
  | { kind: "subdomain"; slug: string }
  | { kind: "custom"; domain: string }

/** Subdomínios que nunca podem ser usados como slug de barbearia. */
export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "login",
  "explore",
  "bookings",
  "onboarding",
  "static",
  "mail",
  "t",
])

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug)
}

function stripPort(host: string): string {
  return host.replace(/:\d+$/, "")
}

export function resolveHost(rawHost: string | null | undefined, rootDomain: string): HostResolution {
  if (!rawHost) {
    return { kind: "platform" }
  }
  const host = stripPort(rawHost.trim().toLowerCase())
  const root = stripPort(rootDomain.trim().toLowerCase())

  if (host === root || host === `www.${root}` || host === "127.0.0.1") {
    return { kind: "platform" }
  }

  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1))
    if (!sub.includes(".") && isValidSlug(sub)) {
      return { kind: "subdomain", slug: sub }
    }
    return { kind: "platform" }
  }

  return { kind: "custom", domain: host }
}

/** Chave usada na rota interna `/t/[tenant]`: slug ou `~<domínio>` para domínio próprio. */
export function tenantRouteKey(resolution: HostResolution): string | null {
  if (resolution.kind === "subdomain") {
    return resolution.slug
  }
  if (resolution.kind === "custom") {
    return `~${resolution.domain}`
  }
  return null
}

/** Domínio para o cookie de sessão compartilhado entre plataforma e subdomínios. */
export function sessionCookieDomain(rootDomain: string): string | undefined {
  const root = stripPort(rootDomain.toLowerCase())
  if (!root.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(root)) {
    return undefined
  }
  return `.${root}`
}
