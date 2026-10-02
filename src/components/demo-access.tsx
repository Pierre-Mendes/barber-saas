"use client"

import { useTransition } from "react"
import { CalendarCheckIcon, ConciergeBellIcon, CrownIcon, ScissorsIcon, ZapIcon } from "lucide-react"
import { toast } from "sonner"
import { demoSignInAction } from "@/app/actions/auth"
import { Card } from "@/components/ui/card"
import type { DemoAccount } from "@/lib/demo"

const ICONS: Record<string, typeof CrownIcon> = {
  "dono@zebu.dev": CrownIcon,
  "recepcao@zebu.dev": ConciergeBellIcon,
  "ze@zebu.dev": ScissorsIcon,
  "cliente@exemplo.dev": CalendarCheckIcon,
}

/**
 * Atalhos na página inicial para entrar direto em cada visão (só com `env.demoLogins`).
 * Equipe cai no painel; cliente, na vitrine.
 */
export function DemoAccess({ accounts }: { accounts: DemoAccount[] }) {
  const [pending, startTransition] = useTransition()
  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <ZapIcon className="size-4 text-primary" /> Experimente cada visão
        </h2>
        <p className="text-sm text-muted-foreground">
          Contas de demonstração (senha <code className="text-foreground">barber123</code>). Um clique e você entra.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {accounts.map((account) => {
          const Icon = ICONS[account.email] ?? ZapIcon
          return (
            <button
              key={account.email}
              type="button"
              disabled={pending}
              className="cursor-pointer text-left disabled:cursor-wait disabled:opacity-60"
              onClick={() =>
                startTransition(async () => {
                  const result = await demoSignInAction(account.email, "/")
                  if (result.ok) {
                    window.location.assign(result.redirectTo)
                  } else {
                    toast.error(result.error)
                  }
                })
              }
            >
              <Card className="flex h-full items-start gap-3 p-4 transition hover:border-primary/60">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{account.label}</p>
                  <p className="text-xs text-muted-foreground">{account.description}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">{account.email}</p>
                </div>
              </Card>
            </button>
          )
        })}
      </div>
    </section>
  )
}
