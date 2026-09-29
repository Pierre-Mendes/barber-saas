import { notFound, redirect } from "next/navigation"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { canManageBarberSchedule, requirePanel } from "@/lib/auth/guards"
import { can, ROLE_LABELS } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { formatDateTime, minutesToHHMM, WEEKDAY_LABELS } from "@/lib/scheduling/time"
import { addTimeOff, removeTimeOff, updateBarberProfile, updateWorkingHours } from "../../actions"

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
    <div className="space-y-8">
      <Flash {...await searchParams} />
      <h1 className="text-2xl font-bold">{barber.name}</h1>

      {canEditProfile && (
        <form action={updateBarberProfile.bind(null, slug, barber.id)} className="card grid gap-3 sm:grid-cols-2">
          <h2 className="label sm:col-span-2">Perfil</h2>
          <input name="name" defaultValue={barber.name} className="input" placeholder="Nome" />
          <input name="photoUrl" defaultValue={barber.photoUrl ?? ""} className="input" placeholder="URL da foto" />
          <textarea name="bio" defaultValue={barber.bio} className="input sm:col-span-2" placeholder="Bio" rows={2} />
          <div>
            <label className="label" htmlFor="userId">Acesso ao painel (vincular usuário)</label>
            <select id="userId" name="userId" defaultValue={barber.userId ?? ""} className="input">
              <option value="">— sem acesso —</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name ?? m.user.email} ({ROLE_LABELS[m.role]})
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={barber.active} /> Ativo (aparece para agendamento)
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="label">Serviços que realiza</legend>
            <div className="flex flex-wrap gap-3">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={offered.has(s.id)} /> {s.name}
                </label>
              ))}
            </div>
          </fieldset>
          <SubmitButton className="btn-primary sm:col-span-2">Salvar perfil</SubmitButton>
        </form>
      )}

      <form action={updateWorkingHours.bind(null, slug, barber.id)} className="card space-y-3">
        <h2 className="label">Horário de trabalho (fuso {ctx.tenant.timezone})</h2>
        <p className="text-xs text-muted">Dois blocos por dia permitem pausa para almoço.</p>
        {WEEKDAY_LABELS.map((label, weekday) => {
          const blocks = barber.workingHours.filter((w) => w.weekday === weekday)
          const [a, b] = blocks
          return (
            <div key={weekday} className="grid grid-cols-[110px_1fr] items-center gap-2 sm:grid-cols-[110px_1fr_1fr]">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`d${weekday}.on`} defaultChecked={blocks.length > 0} /> {label}
              </label>
              <div className="flex items-center gap-1">
                <input type="time" name={`d${weekday}.a.start`} defaultValue={a ? minutesToHHMM(a.startMinute) : "09:00"} className="input" />
                <span>–</span>
                <input type="time" name={`d${weekday}.a.end`} defaultValue={a ? minutesToHHMM(a.endMinute) : "12:00"} className="input" />
              </div>
              <div className="col-start-2 flex items-center gap-1 sm:col-start-auto">
                <input type="time" name={`d${weekday}.b.start`} defaultValue={b ? minutesToHHMM(b.startMinute) : ""} className="input" />
                <span>–</span>
                <input type="time" name={`d${weekday}.b.end`} defaultValue={b ? minutesToHHMM(b.endMinute) : ""} className="input" />
              </div>
            </div>
          )
        })}
        <SubmitButton>Salvar horários</SubmitButton>
      </form>

      <section className="card space-y-3">
        <h2 className="label">Folgas e bloqueios</h2>
        <ul className="space-y-2 text-sm">
          {barber.timeOff.length === 0 && <li className="text-muted">Nenhuma folga futura.</li>}
          {barber.timeOff.map((off) => (
            <li key={off.id} className="flex items-center justify-between gap-2">
              <span>
                {formatDateTime(off.startsAt, ctx.tenant.timezone, { dateStyle: "short" })} →{" "}
                {formatDateTime(off.endsAt, ctx.tenant.timezone, { dateStyle: "short" })}
                {off.reason && <span className="text-muted"> • {off.reason}</span>}
              </span>
              <form action={removeTimeOff.bind(null, slug, barber.id, off.id)}>
                <button className="text-red-300 hover:underline">remover</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addTimeOff.bind(null, slug, barber.id)} className="grid gap-2 sm:grid-cols-3">
          <input type="date" name="startDate" required className="input" />
          <input type="time" name="startTime" className="input" title="Início (vazio = dia todo)" />
          <input name="reason" placeholder="Motivo (opcional)" className="input" />
          <input type="date" name="endDate" className="input" title="Fim (vazio = mesmo dia)" />
          <input type="time" name="endTime" className="input" title="Fim (vazio = fim do dia)" />
          <SubmitButton className="btn-secondary">Bloquear período</SubmitButton>
        </form>
      </section>
    </div>
  )
}
