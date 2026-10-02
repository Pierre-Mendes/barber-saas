import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeftIcon, Trash2Icon } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input"
import { ImageField } from "@/components/admin/image-field"
import { canManageBarberSchedule, requirePanel } from "@/lib/auth/guards"
import { isStorageConfigured } from "@/lib/storage"
import { can, ROLE_LABELS } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { formatDateTime, minutesToHHMM, WEEKDAY_LABELS } from "@/lib/scheduling/time"
import { addTimeOff, removeTimeOff, updateBarberProfile, updateOwnBarberProfile, updateWorkingHours } from "../../actions"

export default async function BarberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>
  searchParams: FlashParams
}) {
  const { slug, id } = await params
  const ctx = await requirePanel(slug, "schedule.manageOwn")
  if (!canManageBarberSchedule(ctx, id)) {
    redirect(`/admin/${slug}?acesso=negado`)
  }
  const barber = await db.barber.findFirst({
    where: { id, tenantId: ctx.tenant.id },
    include: {
      services: true,
      workingHours: { orderBy: { startMinute: "asc" } },
      timeOff: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } },
    },
  })
  if (!barber) {
    notFound()
  }
  const canEditProfile = can(ctx.membership.role, "barbers.manage")
  const [services, members] = canEditProfile
    ? await Promise.all([
        db.service.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: { name: "asc" } }),
        db.membership.findMany({ where: { tenantId: ctx.tenant.id }, include: { user: true } }),
      ])
    : [[], []]
  const offered = new Set(barber.services.map((s) => s.serviceId))

  return (
    <>
      <Flash {...await searchParams} />
      {canEditProfile && (
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href={`/admin/${slug}/barbers`}>
            <ChevronLeftIcon /> Barbeiros
          </Link>
        </Button>
      )}
      <PageHeader title={<span className="flex items-center gap-3"><UserAvatar name={barber.name} image={barber.photoUrl} className="size-12" />{barber.name}</span>} />

      <div className="grid gap-6 lg:grid-cols-2">
        {canEditProfile && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Como o barbeiro aparece para os clientes.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateBarberProfile.bind(null, slug, barber.id)} className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <Input name="name" defaultValue={barber.name} />
                </Field>
                <ImageField label="Foto" fileName="photoFile" urlName="photoUrl" currentUrl={barber.photoUrl} uploadEnabled={isStorageConfigured()} aspect="round" />
                <Field label="Bio" className="sm:col-span-2">
                  <Textarea name="bio" defaultValue={barber.bio} rows={2} />
                </Field>
                <Field label="Acesso ao painel" hint="Vincule a um membro da equipe para ele ver a própria agenda.">
                  <NativeSelect name="userId" defaultValue={barber.userId ?? ""}>
                    <option value="">— sem acesso —</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name ?? m.user.email} ({ROLE_LABELS[m.role]})
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <label className="flex items-center gap-2 self-center text-sm">
                  <input type="checkbox" name="active" defaultChecked={barber.active} className="size-4 accent-[var(--brand)]" />
                  Ativo (aparece para agendamento)
                </label>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-xs font-semibold text-muted-foreground">Serviços que realiza</legend>
                  <div className="flex flex-wrap gap-2">
                    {services.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/15">
                        <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={offered.has(s.id)} className="accent-[var(--brand)]" />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <SubmitButton className="sm:col-span-2 sm:justify-self-start">Salvar perfil</SubmitButton>
              </form>
            </CardContent>
          </Card>
        )}

        {!canEditProfile && ctx.ownBarber?.id === barber.id && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Meu perfil</CardTitle>
              <CardDescription>Como você aparece para os clientes na página da barbearia.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateOwnBarberProfile.bind(null, slug, barber.id)} className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <Input name="name" defaultValue={barber.name} />
                </Field>
                <ImageField label="Foto" fileName="photoFile" urlName="photoUrl" currentUrl={barber.photoUrl} uploadEnabled={isStorageConfigured()} aspect="round" />
                <Field label="Bio" className="sm:col-span-2">
                  <Textarea name="bio" defaultValue={barber.bio} rows={2} />
                </Field>
                <SubmitButton className="sm:col-span-2 sm:justify-self-start">Salvar perfil</SubmitButton>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Horário de trabalho</CardTitle>
            <CardDescription>Dois blocos por dia permitem pausa para almoço. Fuso: {ctx.tenant.timezone}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateWorkingHours.bind(null, slug, barber.id)} className="space-y-3">
              {WEEKDAY_LABELS.map((label, weekday) => {
                const blocks = barber.workingHours.filter((w) => w.weekday === weekday)
                const [a, b] = blocks
                return (
                  <div key={weekday} className="grid grid-cols-[92px_1fr] items-center gap-2 border-b pb-3 last:border-0">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" name={`d${weekday}.on`} defaultChecked={blocks.length > 0} className="size-4 accent-[var(--brand)]" />
                      {label}
                    </label>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-1">
                        <Input type="time" name={`d${weekday}.a.start`} defaultValue={a ? minutesToHHMM(a.startMinute) : "09:00"} />
                        <span className="text-muted-foreground">–</span>
                        <Input type="time" name={`d${weekday}.a.end`} defaultValue={a ? minutesToHHMM(a.endMinute) : "12:00"} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Input type="time" name={`d${weekday}.b.start`} defaultValue={b ? minutesToHHMM(b.startMinute) : ""} />
                        <span className="text-muted-foreground">–</span>
                        <Input type="time" name={`d${weekday}.b.end`} defaultValue={b ? minutesToHHMM(b.endMinute) : ""} />
                      </div>
                    </div>
                  </div>
                )
              })}
              <SubmitButton>Salvar horários</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Folgas e bloqueios</CardTitle>
            <CardDescription>Períodos em que o barbeiro não atende.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {barber.timeOff.length === 0 && <li className="text-muted-foreground">Nenhuma folga futura.</li>}
              {barber.timeOff.map((off) => (
                <li key={off.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <span>
                    {formatDateTime(off.startsAt, ctx.tenant.timezone, { dateStyle: "short" })} →{" "}
                    {formatDateTime(off.endsAt, ctx.tenant.timezone, { dateStyle: "short" })}
                    {off.reason && <span className="block text-xs text-muted-foreground">{off.reason}</span>}
                  </span>
                  <form action={removeTimeOff.bind(null, slug, barber.id, off.id)}>
                    <Button size="icon-sm" variant="ghost" aria-label="Remover folga">
                      <Trash2Icon className="text-red-300" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={addTimeOff.bind(null, slug, barber.id)} className="grid grid-cols-2 gap-3">
              <Field label="Início">
                <Input type="date" name="startDate" required />
              </Field>
              <Field label="Hora (vazio = dia todo)">
                <Input type="time" name="startTime" />
              </Field>
              <Field label="Fim (vazio = mesmo dia)">
                <Input type="date" name="endDate" />
              </Field>
              <Field label="Hora">
                <Input type="time" name="endTime" />
              </Field>
              <Field label="Motivo" className="col-span-2">
                <Input name="reason" placeholder="Férias, curso…" />
              </Field>
              <SubmitButton variant="secondary" className="col-span-2">
                Bloquear período
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
