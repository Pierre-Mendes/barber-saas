import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRightIcon, StoreIcon } from "lucide-react"
import { Footer, PlatformHeader } from "@/components/platform-header"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { requireUser } from "@/lib/auth/guards"
import { ROLE_LABELS } from "@/lib/auth/permissions"
import { db } from "@/lib/db"

export default async function AdminIndexPage() {
  const user = await requireUser("/admin")
  const memberships = await db.membership.findMany({
    where: { userId: user.id, tenant: { active: true } },
    include: { tenant: true },
    orderBy: { tenant: { name: "asc" } },
  })
  if (memberships.length === 1) {
    redirect(`/admin/${memberships[0].tenant.slug}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
        <h1 className="text-2xl font-bold">Seus painéis</h1>
        {memberships.length === 0 && (
          <Card className="mt-6 flex flex-col items-center gap-3 p-8 text-center">
            <StoreIcon className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">Você ainda não faz parte de nenhuma barbearia.</p>
            <Button asChild>
              <Link href="/onboarding">Cadastrar a minha</Link>
            </Button>
          </Card>
        )}
        <div className="mt-6 space-y-3">
          {memberships.map((m) => (
            <Link key={m.id} href={`/admin/${m.tenant.slug}`}>
              <Card className="flex items-center gap-4 p-4 transition hover:border-primary/60">
                <UserAvatar name={m.tenant.name} image={m.tenant.logoUrl} />
                <span className="flex-1 font-semibold">{m.tenant.name}</span>
                <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                <ChevronRightIcon className="size-5 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
