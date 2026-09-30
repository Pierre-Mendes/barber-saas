import { Trash2Icon } from "lucide-react"
import { FormSheet } from "@/components/admin/form-sheet"
import { PageHeader } from "@/components/admin/page-header"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input, NativeSelect } from "@/components/ui/input"
import { requirePanel } from "@/lib/auth/guards"
import { assignableRoles, canManageMember, ROLE_LABELS } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { changeMemberRole, inviteMember, removeMember } from "../actions"

const ROLE_HELP = {
  OWNER: "Tudo, inclusive personalização, link e equipe.",
  MANAGER: "Barbeiros, serviços, agenda de todos e equipe (exceto donos e gerentes).",
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
    <>
      <Flash {...await searchParams} />
      <PageHeader title="Equipe e acessos" description="Quem entra no painel e o que cada pessoa pode fazer.">
        <FormSheet triggerLabel="Dar acesso" title="Dar acesso ao painel" description="A pessoa entra com o próprio e-mail (link de acesso).">
          <form action={inviteMember.bind(null, slug)} className="grid gap-4">
            <Field label="Nome">
              <Input name="name" />
            </Field>
            <Field label="E-mail">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Papel">
              <NativeSelect name="role">
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <SubmitButton>Liberar acesso</SubmitButton>
          </form>
        </FormSheet>
      </PageHeader>

      <Card>
        <ul className="divide-y">
          {members.map((member) => {
            const editable = member.id !== ctx.membership.id && canManageMember(ctx.membership.role, member.role)
            return (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={member.user.name ?? member.user.email} image={member.user.image} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {member.user.name ?? member.user.email}
                      {member.id === ctx.membership.id && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                {editable ? (
                  <div className="flex items-center gap-2">
                    <form action={changeMemberRole.bind(null, slug, member.id)} className="flex gap-2">
                      <NativeSelect name="role" defaultValue={member.role} className="h-8 w-auto text-xs">
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </NativeSelect>
                      <SubmitButton size="sm" variant="secondary">
                        Alterar
                      </SubmitButton>
                    </form>
                    <form action={removeMember.bind(null, slug, member.id)}>
                      <Button size="icon-sm" variant="ghost" aria-label="Remover acesso">
                        <Trash2Icon className="text-red-300" />
                      </Button>
                    </form>
                  </div>
                ) : (
                  <Badge variant={member.role === "OWNER" ? "solid" : "secondary"}>{ROLE_LABELS[member.role]}</Badge>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Níveis de acesso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {Object.entries(ROLE_HELP).map(([role, help]) => (
            <div key={role} className="rounded-lg border p-3">
              <Badge variant={role === "OWNER" ? "solid" : "default"}>{ROLE_LABELS[role as keyof typeof ROLE_HELP]}</Badge>
              <p className="mt-2 text-sm text-muted-foreground">{help}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
