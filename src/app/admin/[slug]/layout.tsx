import { signOut } from "@/auth"
import { BrandStyle } from "@/components/brand-style"
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav"
import { requirePanel } from "@/lib/auth/guards"
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"

const NAV: (Omit<AdminNavItem, "href"> & { path: string; permission: Permission })[] = [
  { path: "", label: "Agenda", icon: "agenda", permission: "panel.access" },
  { path: "/barbers", label: "Barbeiros", icon: "barbers", permission: "schedule.manageOwn" },
  { path: "/services", label: "Serviços", icon: "services", permission: "services.manage" },
  { path: "/team", label: "Equipe e acessos", icon: "team", permission: "team.manage" },
  { path: "/settings", label: "Personalização", icon: "settings", permission: "settings.manage" },
]

export default async function PanelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ctx = await requirePanel(slug)
  const items = NAV.filter((item) => can(ctx.membership.role, item.permission)).map(({ path, label, icon }) => ({
    href: `/admin/${slug}${path}`,
    label,
    icon,
  }))

  async function signOutAction() {
    "use server"
    await signOut({ redirectTo: "/" })
  }

  return (
    <div className="min-h-screen md:flex">
      <BrandStyle color={ctx.tenant.primaryColor} />
      <AdminNav
        tenantName={ctx.tenant.name}
        logoUrl={ctx.tenant.logoUrl}
        roleLabel={ROLE_LABELS[ctx.membership.role]}
        publicUrl={tenantPublicUrlFor(ctx.tenant)}
        items={items}
        signOutAction={signOutAction}
      />
      <main className="min-w-0 flex-1 p-5 md:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
