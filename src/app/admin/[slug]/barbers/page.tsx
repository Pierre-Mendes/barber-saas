import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRightIcon } from "lucide-react"
import { FormSheet } from "@/components/admin/form-sheet"
import { PageHeader } from "@/components/admin/page-header"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Field, Input } from "@/components/ui/input"
import { requirePanel } from "@/lib/auth/guards"
import { can } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { createBarber } from "../actions"

export default async function BarbersPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: FlashParams }) {
  const { slug } = await params
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  if (!can(ctx.membership.role, "barbers.manage")) {
    // Barbeiro vai direto para os próprios horários.
    redirect(ctx.ownBarber ? `/admin/${slug}/barbers/${ctx.ownBarber.id}` : `/admin/${slug}`)
  }
  const barbers = await db.barber.findMany({
    where: { tenantId: ctx.tenant.id },
    include: {
      user: { select: { email: true } },
      _count: { select: { services: true, bookings: { where: { status: "COMPLETED" } } } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  return (
    <>
      <Flash {...await searchParams} />
      <PageHeader title="Barbeiros" description="Cada barbeiro tem a própria agenda, serviços e folgas.">
        <FormSheet triggerLabel="Novo barbeiro" title="Novo barbeiro" description="Começa com seg–sáb, 9h–19h e todos os serviços. Ajuste depois.">
          <form action={createBarber.bind(null, slug)} className="grid gap-4">
            <Field label="Nome">
              <Input name="name" required />
            </Field>
            <SubmitButton>Adicionar</SubmitButton>
          </form>
        </FormSheet>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {barbers.map((barber) => (
          <Link key={barber.id} href={`/admin/${slug}/barbers/${barber.id}`}>
            <Card className="flex items-center gap-4 p-4 transition hover:border-primary/60">
              <UserAvatar name={barber.name} image={barber.photoUrl} className="size-12" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{barber.name}</p>
                  {!barber.active && <Badge variant="secondary">inativo</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {barber._count.services} serviços · {barber._count.bookings} atendimentos
                </p>
                <p className="truncate text-xs text-muted-foreground">{barber.user?.email ?? "sem acesso ao painel"}</p>
              </div>
              <ChevronRightIcon className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
