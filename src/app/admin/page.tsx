import Link from "next/link"
import { redirect } from "next/navigation"
import { PlatformHeader } from "@/components/platform-header"
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
    <>
      <PlatformHeader />
      <main className="mx-auto max-w-xl px-5 py-10">
        <h1 className="text-2xl font-bold">Seus painéis</h1>
        {memberships.length === 0 && (
          <p className="mt-4 text-sm text-muted">
            Você ainda não faz parte de nenhuma barbearia.{" "}
            <Link href="/onboarding" className="text-brand">Cadastre a sua</Link>.
          </p>
        )}
        <ul className="mt-6 space-y-3">
          {memberships.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/${m.tenant.slug}`} className="card flex justify-between hover:border-brand">
                <span className="font-semibold">{m.tenant.name}</span>
                <span className="text-sm text-muted">{ROLE_LABELS[m.role]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
