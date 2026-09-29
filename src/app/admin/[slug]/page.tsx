import Link from "next/link"
import { BookingStatusBadge } from "@/components/booking-status-badge"
import { Flash } from "@/components/flash"
import { PushOptIn } from "@/components/push-opt-in"
import { SubmitButton } from "@/components/submit-button"
import { requirePanel } from "@/lib/auth/guards"
import { can } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { addDays, formatDateTime, formatTime, localDayBounds, toLocalDate, zonedToUtc } from "@/lib/scheduling/time"
import { staffCancelBooking, staffCreateBooking, staffSetOutcome } from "./actions"

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ data?: string; barbeiro?: string; ok?: string; erro?: string; acesso?: string }>
}) {
  const { slug } = await params
  const query = await searchParams
  const ctx = await requirePanel(slug)
  const { tenant } = ctx
  const seesAll = can(ctx.membership.role, "bookings.viewAll")

  const today = toLocalDate(new Date(), tenant.timezone)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.data ?? "") ? query.data! : today
  const { start, end } = localDayBounds(date, tenant.timezone)

  const barbers = await db.barber.findMany({
    where: { tenantId: tenant.id, ...(seesAll ? {} : { id: ctx.ownBarber?.id ?? "__none__" }) },
    orderBy: { name: "asc" },
  })
  const barberFilter = seesAll ? query.barbeiro : ctx.ownBarber?.id
  const services = await db.service.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { name: "asc" } })

  const bookings = await db.booking.findMany({
    where: {
      tenantId: tenant.id,
      startsAt: { gte: start, lt: end },
      ...(barberFilter ? { barberId: barberFilter } : seesAll ? {} : { barberId: "__none__" }),
    },
    include: { customer: { include: { user: { select: { email: true } } } }, service: true, barber: true },
    orderBy: { startsAt: "asc" },
  })
  const revenue = bookings
    .filter((b) => b.status === "COMPLETED" || b.status === "CONFIRMED")
    .reduce((sum, b) => sum + Number(b.price), 0)

  const returnTo = `/admin/${slug}?data=${date}${barberFilter && seesAll ? `&barbeiro=${barberFilter}` : ""}`
  const link = (d: string) => `/admin/${slug}?data=${d}${query.barbeiro ? `&barbeiro=${query.barbeiro}` : ""}`
  const title = formatDateTime(zonedToUtc(date, 12 * 60, tenant.timezone), tenant.timezone, {
    dateStyle: "full",
    timeStyle: undefined,
  })

  return (
    <div className="space-y-6">
      <Flash ok={query.ok} erro={query.erro ?? (query.acesso ? "Você não tem acesso a essa área." : undefined)} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold first-letter:uppercase">{title}</h1>
          <p className="text-sm text-muted">
            {bookings.filter((b) => b.status !== "CANCELLED").length} atendimentos • previsão {currency.format(revenue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={link(addDays(date, -1))} className="btn-secondary">←</Link>
          <Link href={link(today)} className="btn-secondary">Hoje</Link>
          <Link href={link(addDays(date, 1))} className="btn-secondary">→</Link>
          <form className="flex gap-2">
            <input type="date" name="data" defaultValue={date} className="input w-auto" />
            {seesAll && (
              <select name="barbeiro" defaultValue={query.barbeiro ?? ""} className="input w-auto">
                <option value="">Todos</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <button className="btn-secondary">Ir</button>
          </form>
        </div>
      </div>

      {!seesAll && !ctx.ownBarber && (
        <p className="card text-sm text-muted">Seu usuário ainda não está vinculado a um perfil de barbeiro. Peça ao dono.</p>
      )}

      <PushOptIn vapidPublicKey={env.vapidPublicKey} />

      <ul className="space-y-2">
        {bookings.length === 0 && <li className="card text-sm text-muted">Nenhum agendamento neste dia.</li>}
        {bookings.map((booking) => (
          <li key={booking.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="w-24 font-mono text-lg">
                {formatTime(booking.startsAt, tenant.timezone)}
                <span className="block text-xs text-muted">até {formatTime(booking.endsAt, tenant.timezone)}</span>
              </span>
              <div>
                <p className="font-semibold">
                  {booking.customer.name} <BookingStatusBadge status={booking.status} />
                </p>
                <p className="text-sm text-muted">
                  {booking.service.name} • {booking.barber.name} • {currency.format(Number(booking.price))}
                </p>
                <p className="text-xs text-muted">
                  {booking.customer.phone ?? "sem telefone"} • {booking.customer.user.email}
                </p>
              </div>
            </div>
            {booking.status === "CONFIRMED" && (
              <div className="flex gap-2">
                <form action={staffSetOutcome.bind(null, slug, booking.id, "COMPLETED", returnTo)}>
                  <button className="btn-secondary">Concluído</button>
                </form>
                <form action={staffSetOutcome.bind(null, slug, booking.id, "NO_SHOW", returnTo)}>
                  <button className="btn-secondary">Faltou</button>
                </form>
                <form action={staffCancelBooking.bind(null, slug, booking.id, returnTo)}>
                  <button className="btn-danger">Cancelar</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>

      {barbers.length > 0 && services.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">+ Agendar para um cliente (telefone / balcão)</summary>
          <form action={staffCreateBooking.bind(null, slug)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Nome do cliente" className="input" />
            <input name="email" type="email" required placeholder="E-mail (recebe a confirmação)" className="input" />
            <input name="phone" placeholder="Celular" className="input" />
            <select name="serviceId" required className="input">
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>
              ))}
            </select>
            <select name="barberId" required className="input" defaultValue={barberFilter}>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input name="date" type="date" required defaultValue={date} className="input" />
              <input name="time" type="time" required step={300} className="input" />
            </div>
            <SubmitButton className="btn-primary sm:col-span-2">Agendar</SubmitButton>
          </form>
        </details>
      )}
    </div>
  )
}
