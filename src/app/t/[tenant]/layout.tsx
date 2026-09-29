import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { auth, signOut } from "@/auth"
import { getTenantByRouteKey, tenantBasePath } from "@/lib/tenancy/tenant"

type Params = { params: Promise<{ tenant: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tenant = await getTenantByRouteKey((await params).tenant)
  return tenant ? { title: `${tenant.name} — Agendamento`, description: tenant.description } : {}
}

/** Layout white-label: só a marca da barbearia, sem referência à plataforma nem a outras barbearias. */
export default async function TenantLayout({ children, params }: Params & { children: React.ReactNode }) {
  const tenant = await getTenantByRouteKey((await params).tenant)
  if (!tenant) {
    notFound()
  }
  const base = await tenantBasePath(tenant)
  const session = await auth()

  return (
    <div style={{ "--brand": tenant.primaryColor } as React.CSSProperties}>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href={base || "/"} className="flex items-center gap-3">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt={tenant.name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-bold">
                {tenant.name.charAt(0)}
              </span>
            )}
            <span className="font-bold">{tenant.name}</span>
          </Link>
          {session?.user ? (
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: base || "/" })
              }}
            >
              <span className="mr-3 text-sm text-muted">{session.user.name ?? session.user.email}</span>
              <button className="text-sm text-muted hover:text-white">Sair</button>
            </form>
          ) : (
            <Link href={`/login?callbackUrl=${encodeURIComponent(base || "/")}`} className="btn-secondary">
              Entrar
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">{children}</main>
    </div>
  )
}
