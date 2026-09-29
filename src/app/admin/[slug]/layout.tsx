import Link from "next/link"
import { signOut } from "@/auth"
import { requirePanel } from "@/lib/auth/guards"
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"

const NAV: { href: string; label: string; permission: Permission }[] = [
  { href: "", label: "Agenda", permission: "panel.access" },
  { href: "/barbers", label: "Barbeiros", permission: "schedule.manageOwn" },
  { href: "/services", label: "Serviços", permission: "services.manage" },
  { href: "/team", label: "Equipe e acessos", permission: "team.manage" },
  { href: "/settings", label: "Personalização", permission: "settings.manage" },
]

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ctx = await requirePanel(slug)
  const publicUrl = tenantPublicUrlFor(ctx.tenant)

  return (
    <div style={{ "--brand": ctx.tenant.primaryColor } as React.CSSProperties} className="md:flex">
      <aside className="border-b border-line p-5 md:min-h-screen md:w-60 md:border-r md:border-b-0">
        <p className="font-bold">{ctx.tenant.name}</p>
        <p className="text-xs text-muted">{ROLE_LABELS[ctx.membership.role]}</p>
        <nav className="mt-6 flex flex-wrap gap-2 md:flex-col md:gap-1">
          {NAV.filter((item) => can(ctx.membership.role, item.permission)).map((item) => (
            <Link key={item.href} href={`/admin/${slug}${item.href}`} className="rounded-lg px-3 py-2 text-sm hover:bg-card">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 space-y-2 text-xs">
          <p className="text-muted">Seu link para divulgar:</p>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="break-all text-brand">
            {publicUrl}
          </a>
        </div>
        <form
          className="mt-6"
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}
        >
          <button className="text-sm text-muted hover:text-white">Sair</button>
        </form>
      </aside>
      <main className="flex-1 p-5 md:p-8">{children}</main>
    </div>
  )
}
