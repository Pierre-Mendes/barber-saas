import Link from "next/link"
import type { Tenant } from "@prisma/client"
import { auth, signOut } from "@/auth"
import { AppMenu, type MenuLink } from "@/components/app-menu"
import { UserAvatar } from "@/components/user-avatar"
import { Card } from "@/components/ui/card"
import { signInOptions } from "@/lib/auth/options"

/** Menu da página white-label: só links da própria barbearia, nada da plataforma. */
export async function TenantMenu({ basePath, triggerClassName }: { basePath: string; triggerClassName?: string }) {
  const session = await auth()
  const links: MenuLink[] = [
    { href: basePath || "/", label: "Início", icon: "home" },
    { href: `${basePath}/agendamentos`, label: "Meus agendamentos", icon: "calendar" },
  ]
  async function signOutAction() {
    "use server"
    await signOut({ redirectTo: basePath || "/" })
  }
  return (
    <AppMenu
      user={session?.user ?? null}
      links={links}
      signInOptions={signInOptions()}
      signOutAction={signOutAction}
      triggerClassName={triggerClassName}
    />
  )
}

export function TenantHeader({ tenant, basePath }: { tenant: Tenant; basePath: string }) {
  return (
    <Card className="rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link href={basePath || "/"} className="flex items-center gap-3">
          <UserAvatar name={tenant.name} image={tenant.logoUrl} className="size-9" />
          <span className="font-bold">{tenant.name}</span>
        </Link>
        <TenantMenu basePath={basePath} />
      </div>
    </Card>
  )
}

export function TenantFooter({ tenant }: { tenant: Tenant }) {
  return (
    <footer className="mt-10 border-t bg-card">
      <div className="mx-auto max-w-3xl px-5 py-6">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} <span className="font-bold text-foreground">{tenant.name}</span>
        </p>
      </div>
    </footer>
  )
}
