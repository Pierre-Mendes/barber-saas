import Link from "next/link"
import { ScissorsIcon } from "lucide-react"
import { auth, signOut } from "@/auth"
import { AppMenu, type MenuLink } from "@/components/app-menu"
import { Card } from "@/components/ui/card"
import { PLATFORM_NAME } from "@/lib/catalog"
import { db } from "@/lib/db"

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

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
  const hasPanel = user?.id ? (await db.membership.count({ where: { userId: user.id } })) > 0 : false

  const links: MenuLink[] = [
    { href: "/", label: "Início", icon: "home" },
    { href: "/bookings", label: "Agendamentos", icon: "calendar" },
    hasPanel ? { href: "/admin", label: "Painel da barbearia", icon: "panel" } : { href: "/onboarding", label: "Cadastrar minha barbearia", icon: "store" },
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
        <AppMenu
          user={user}
          links={links}
          showCategories
          googleEnabled={googleEnabled}
          signOutAction={signOutAction}
        />
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
