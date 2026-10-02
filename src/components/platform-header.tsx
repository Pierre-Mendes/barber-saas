import Link from "next/link"
import { ScissorsIcon } from "lucide-react"
import { auth, signOut } from "@/auth"
import { AppMenu, type MenuLink } from "@/components/app-menu"
import { SignInButton } from "@/components/sign-in-button"
import { Card } from "@/components/ui/card"
import { signInOptions } from "@/lib/auth/options"
import { ROLE_LABELS } from "@/lib/auth/permissions"
import { PLATFORM_NAME } from "@/lib/catalog"
import { db } from "@/lib/db"

export function PlatformLogo() {
  return (
    <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ScissorsIcon className="size-4" />
      </span>
      {PLATFORM_NAME}
    </span>
  )
}

/** Cabeçalho das telas da plataforma (home, busca, agendamentos). */
export async function PlatformHeader() {
  const session = await auth()
  const user = session?.user ?? null
  const memberships = user?.id
    ? await db.membership.findMany({
        where: { userId: user.id, tenant: { active: true } },
        select: { role: true, tenant: { select: { slug: true, name: true } } },
        orderBy: { tenant: { name: "asc" } },
      })
    : []

  // Equipe vê um atalho para cada painel em que trabalha; os demais podem cadastrar a própria barbearia.
  const panelLinks: MenuLink[] = memberships.map((m) => ({
    href: `/admin/${m.tenant.slug}`,
    label: `Painel · ${m.tenant.name} (${ROLE_LABELS[m.role]})`,
    icon: "panel",
  }))
  const links: MenuLink[] = [
    { href: "/", label: "Início", icon: "home" },
    { href: "/bookings", label: "Agendamentos", icon: "calendar" },
    ...(user ? [{ href: "/conta", label: "Minha conta", icon: "account" } as const] : []),
    ...(panelLinks.length > 0 ? panelLinks : [{ href: "/onboarding", label: "Cadastrar minha barbearia", icon: "store" } as const]),
  ]

  async function signOutAction() {
    "use server"
    await signOut({ redirectTo: "/" })
  }

  return (
    <Card className="rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/">
          <PlatformLogo />
        </Link>
        <div className="flex items-center gap-2">
          {/* Sem login: botão visível (não só dentro do menu). */}
          {!user && (
            <SignInButton signInOptions={signInOptions()} callbackUrl="/">
              Entrar
            </SignInButton>
          )}
          <AppMenu
            user={user}
            links={links}
            showCategories
            signInOptions={signInOptions()}
            signOutAction={signOutAction}
          />
        </div>
      </div>
    </Card>
  )
}

export function Footer({ name = PLATFORM_NAME }: { name?: string }) {
  return (
    <footer className="mt-10 border-t bg-card">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} <span className="font-bold text-foreground">{name}</span>
        </p>
      </div>
    </footer>
  )
}
