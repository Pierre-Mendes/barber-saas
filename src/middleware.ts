import { NextResponse, type NextRequest } from "next/server"
import { resolveHost, tenantRouteKey } from "@/lib/tenancy/host"

const TENANT_REWRITE_HEADER = "x-tenant-rewrite"

/** Caminhos servidos igualmente em qualquer host (não são reescritos para a barbearia). */
const SHARED_PREFIXES = ["/api", "/_next", "/login", "/sw.js", "/manifest.webmanifest", "/favicon.ico", "/icon"]

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  // Nunca confiar nesse header vindo do cliente.
  requestHeaders.delete(TENANT_REWRITE_HEADER)

  const { pathname, search } = request.nextUrl
  const resolution = resolveHost(request.headers.get("host"), process.env.ROOT_DOMAIN ?? "localhost:3000")
  const key = tenantRouteKey(resolution)

  if (!key || SHARED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  requestHeaders.set(TENANT_REWRITE_HEADER, "1")
  const target = new URL(`/t/${encodeURIComponent(key)}${pathname === "/" ? "" : pathname}${search}`, request.url)
  return NextResponse.rewrite(target, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
