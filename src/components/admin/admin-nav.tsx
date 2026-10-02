"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRightIcon,
  CalendarDaysIcon,
  CircleUserIcon,
  ExternalLinkIcon,
  LogOutIcon,
  MenuIcon,
  PaletteIcon,
  ScissorsIcon,
  UsersIcon,
  UserSquareIcon,
} from "lucide-react"
import { toast } from "sonner"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const ICONS = {
  agenda: CalendarDaysIcon,
  barbers: UserSquareIcon,
  services: ScissorsIcon,
  team: UsersIcon,
  settings: PaletteIcon,
}

export interface AdminNavItem {
  href: string
  label: string
  icon: keyof typeof ICONS
}

interface AdminNavProps {
  tenantName: string
  logoUrl: string | null
  roleLabel: string
  publicUrl: string
  items: AdminNavItem[]
  /** A pessoa faz parte de mais de uma barbearia. */
  hasOtherPanels: boolean
  signOutAction: () => Promise<void>
}

function NavLinks({ items, onNavigate }: { items: AdminNavItem[]; onNavigate?: boolean }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon]
        const active = item.icon === "agenda" ? pathname === item.href : pathname.startsWith(item.href)
        const link = (
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" />
            {item.label}
          </Link>
        )
        return onNavigate ? (
          <SheetClose key={item.href} asChild>
            {link}
          </SheetClose>
        ) : (
          <div key={item.href}>{link}</div>
        )
      })}
    </nav>
  )
}

function PublicLink({ url }: { url: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">Seu link para divulgar</p>
      <p className="mt-1 truncate text-sm font-medium text-primary">{url.replace(/^https?:\/\//, "")}</p>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copiado!"))}
        >
          Copiar
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <a href={url} target="_blank" rel="noreferrer" aria-label="Abrir página">
            <ExternalLinkIcon />
          </a>
        </Button>
      </div>
    </div>
  )
}

/** Navegação do painel: barra lateral no desktop e menu em gaveta no celular. */
export function AdminNav({ tenantName, logoUrl, roleLabel, publicUrl, items, hasOtherPanels, signOutAction }: AdminNavProps) {
  const brand = (
    <div className="flex items-center gap-3">
      <UserAvatar name={tenantName} image={logoUrl} />
      <div className="min-w-0">
        <p className="truncate font-bold">{tenantName}</p>
        <p className="text-xs text-muted-foreground">{roleLabel}</p>
      </div>
    </div>
  )
  const signOut = (
    <div className="space-y-1">
      {hasOtherPanels && (
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" asChild>
          <Link href="/admin?todas=1">
            <ArrowLeftRightIcon className="size-[18px]" /> Trocar de barbearia
          </Link>
        </Button>
      )}
      <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" asChild>
        <Link href="/conta">
          <CircleUserIcon className="size-[18px]" /> Minha conta
        </Link>
      </Button>
      <form action={signOutAction}>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
          <LogOutIcon className="size-[18px]" /> Sair
        </Button>
      </form>
    </div>
  )

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r bg-card p-5 md:flex">
        {brand}
        <NavLinks items={items} />
        <div className="mt-auto space-y-3">
          <PublicLink url={publicUrl} />
          {signOut}
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card px-5 py-3 md:hidden">
        {brand}
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Abrir menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Painel</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 p-5">
              <NavLinks items={items} onNavigate />
              <div className="mt-auto space-y-3">
                <PublicLink url={publicUrl} />
                {signOut}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  )
}
