import Link from "next/link"
import { redirect } from "next/navigation"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { requirePanel } from "@/lib/auth/guards"
import { can } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { createBarber } from "../actions"

export default async function BarbersPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: FlashParams }) {
  const { slug } = await params
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  if (!can(ctx.membership.role, "barbers.manage")) {
    // Barbeiro vai direto para a própria agenda de horários.
    redirect(ctx.ownBarber ? `/admin/${slug}/barbers/${ctx.ownBarber.id}` : `/admin/${slug}`)
  }
  const barbers = await db.barber.findMany({
    where: { tenantId: ctx.tenant.id },
    include: { user: { select: { email: true } }, _count: { select: { services: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  return (
    <div className="space-y-6">
      <Flash {...await searchParams} />
      <h1 className="text-2xl font-bold">Barbeiros</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {barbers.map((barber) => (
          <li key={barber.id}>
            <Link href={`/admin/${slug}/barbers/${barber.id}`} className="card block hover:border-brand">
              <p className="font-semibold">
                {barber.name} {!barber.active && <span className="badge bg-line text-muted">inativo</span>}
              </p>
              <p className="text-xs text-muted">
                {barber._count.services} serviços • {barber.user?.email ?? "sem acesso ao painel"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <form action={createBarber.bind(null, slug)} className="card flex gap-2">
        <input name="name" required placeholder="Nome do novo barbeiro" className="input" />
        <SubmitButton>Adicionar</SubmitButton>
      </form>
    </div>
  )
}
