import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { requirePanel } from "@/lib/auth/guards"
import { assignableRoles, canManageMember, ROLE_LABELS } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { changeMemberRole, inviteMember, removeMember } from "../actions"

const ROLE_HELP = {
  OWNER: "Tudo, inclusive personalização e equipe.",
  MANAGER: "Barbeiros, serviços, agenda de todos e equipe (exceto donos/gerentes).",
  RECEPTIONIST: "Vê e gerencia a agenda de todos os barbeiros.",
  BARBER: "Só a própria agenda, horários e folgas.",
} as const

export default async function TeamPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: FlashParams }) {
  const { slug } = await params
  const ctx = await requirePanel(slug, "team.manage")
  const members = await db.membership.findMany({
    where: { tenantId: ctx.tenant.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  })
  const roles = assignableRoles(ctx.membership.role)

  return (
    <div className="space-y-6">
      <Flash {...await searchParams} />
      <h1 className="text-2xl font-bold">Equipe e acessos</h1>

      <ul className="space-y-2">
        {members.map((member) => {
          const editable = member.id !== ctx.membership.id && canManageMember(ctx.membership.role, member.role)
          return (
            <li key={member.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{member.user.name ?? member.user.email}</p>
                <p className="text-xs text-muted">{member.user.email}</p>
              </div>
              {editable ? (
                <div className="flex gap-2">
                  <form action={changeMemberRole.bind(null, slug, member.id)} className="flex gap-2">
                    <select name="role" defaultValue={member.role} className="input w-auto">
                      {roles.map((role) => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                    <SubmitButton className="btn-secondary">Alterar</SubmitButton>
                  </form>
                  <form action={removeMember.bind(null, slug, member.id)}>
                    <button className="btn-danger">Remover</button>
                  </form>
                </div>
              ) : (
                <span className="badge bg-line">{ROLE_LABELS[member.role]}</span>
              )}
            </li>
          )
        })}
      </ul>

      <form action={inviteMember.bind(null, slug)} className="card grid gap-2 sm:grid-cols-4">
        <h2 className="label sm:col-span-4">Dar acesso ao painel</h2>
        <input name="name" placeholder="Nome" className="input" />
        <input name="email" type="email" required placeholder="E-mail" className="input" />
        <select name="role" className="input">
          {roles.map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>
        <SubmitButton>Liberar acesso</SubmitButton>
      </form>

      <dl className="card grid gap-2 text-sm sm:grid-cols-2">
        {Object.entries(ROLE_HELP).map(([role, help]) => (
          <div key={role}>
            <dt className="font-semibold">{ROLE_LABELS[role as keyof typeof ROLE_HELP]}</dt>
            <dd className="text-muted">{help}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
