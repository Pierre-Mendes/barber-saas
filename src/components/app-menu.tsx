"use client"

import Link from "next/link"
import {
  CalendarIcon,
  CircleUserIcon,
  HomeIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  StoreIcon,
} from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import { SignInDialogContent } from "@/components/sign-in-dialog"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { SignInOptions } from "@/lib/auth/options"
import { SERVICE_CATEGORIES } from "@/lib/catalog"

const ICONS = {
  home: HomeIcon,
  calendar: CalendarIcon,
  panel: LayoutDashboardIcon,
  store: StoreIcon,
  search: SearchIcon,
  account: CircleUserIcon,
}

export interface MenuLink {
  href: string
  label: string
  icon: keyof typeof ICONS
}

interface AppMenuProps {
  user: { name?: string | null; email?: string | null; image?: string | null } | null
  links: MenuLink[]
  /** Mostra os atalhos de categorias (só na plataforma, nunca na página da barbearia). */
  showCategories?: boolean
  signInOptions: SignInOptions
  signOutAction: () => Promise<void>
  triggerClassName?: string
}

/** Menu lateral (como no projeto base): usuário, navegação, categorias e sair. */
export function AppMenu({ user, links, showCategories, signInOptions, signOutAction, triggerClassName }: AppMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className={triggerClassName} aria-label="Abrir menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between gap-3 border-b px-5 py-5">
          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={user.name ?? user.email} image={user.image} />
              <div className="min-w-0">
                <p className="truncate font-bold">{user.name ?? "Olá!"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-bold">Olá, faça seu login!</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="icon" aria-label="Entrar">
                    <LogInIcon />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <SignInDialogContent options={signInOptions} />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        <nav className="flex flex-col gap-1 border-b px-3 py-4">
          {links.map((link) => {
            const Icon = ICONS[link.icon]
            return (
              <SheetClose key={link.href} asChild>
                <Button variant="ghost" className="justify-start gap-3" asChild>
                  <Link href={link.href}>
                    <Icon className="size-[18px]" />
                    {link.label}
                  </Link>
                </Button>
              </SheetClose>
            )
          })}
        </nav>

        {showCategories && (
          <nav className="flex flex-col gap-1 border-b px-3 py-4">
            {SERVICE_CATEGORIES.map((category) => (
              <SheetClose key={category.slug} asChild>
                <Button variant="ghost" className="justify-start gap-3" asChild>
                  <Link href={`/explore?servico=${category.slug}`}>
                    <CategoryIcon slug={category.slug} className="size-[18px] text-primary" />
                    {category.title}
                  </Link>
                </Button>
              </SheetClose>
            ))}
          </nav>
        )}

        {user && (
          <form action={signOutAction} className="px-3 py-4">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <LogOutIcon className="size-[18px]" />
              Sair da conta
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
