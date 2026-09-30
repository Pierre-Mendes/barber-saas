import Link from "next/link"
import { CalendarCheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, WalletIcon } from "lucide-react"
import { FormSheet } from "@/components/admin/form-sheet"
import { PageHeader, StatCard } from "@/components/admin/page-header"
import { BookingStatusBadge } from "@/components/booking-item"
import { Flash } from "@/components/flash"
import { PushOptIn } from "@/components/push-opt-in"
import { SubmitButton } from "@/components/submit-button"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, Input, NativeSelect } from "@/components/ui/input"
import { requirePanel } from "@/lib/auth/guards"
import { can } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { addDays, formatDateTime, formatTime, localDayBounds, toLocalDate, zonedToUtc } from "@/lib/scheduling/time"
import { formatCurrency } from "@/lib/utils"
import { staffCancelBooking, staffCreateBooking, staffSetOutcome } from "./actions"

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
  const active = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED")
  const revenue = active.reduce((sum, b) => sum + Number(b.price), 0)
  const pending = bookings.filter((b) => b.status === "CONFIRMED").length

  const returnTo = `/admin/${slug}?data=${date}${barberFilter && seesAll ? `&barbeiro=${barberFilter}` : ""}`
  const link = (d: string) => `/admin/${slug}?data=${d}${query.barbeiro ? `&barbeiro=${query.barbeiro}` : ""}`
  const title = formatDateTime(zonedToUtc(date, 12 * 60, tenant.timezone), tenant.timezone, { dateStyle: "full", timeStyle: undefined })

  return (
    <>
      <Flash ok={query.ok} erro={query.erro ?? (query.acesso ? "Você não tem acesso a essa área." : undefined)} />
      <PageHeader title={title} description={date === today ? "Hoje" : undefined}>
        <Button size="icon" variant="outline" asChild>
          <Link href={link(addDays(date, -1))} aria-label="Dia anterior">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={link(today)}>Hoje</Link>
        </Button>
        <Button size="icon" variant="outline" asChild>
          <Link href={link(addDays(date, 1))} aria-label="Próximo dia">
            <ChevronRightIcon />
          </Link>
        </Button>
        {barbers.length > 0 && services.length > 0 && (
          <FormSheet triggerLabel="Agendar" title="Novo agendamento" description="Para clientes que ligaram ou vieram ao balcão. O cliente recebe a confirmação por e-mail.">
            <form action={staffCreateBooking.bind(null, slug)} className="grid gap-4">
              <Field label="Nome do cliente">
                <Input name="name" required />
              </Field>
              <Field label="E-mail" hint="Recebe a confirmação e o lembrete.">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Celular">
                <Input name="phone" inputMode="tel" />
              </Field>
              <Field label="Serviço">
                <NativeSelect name="serviceId" required>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min)
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Profissional">
                <NativeSelect name="barberId" required defaultValue={barberFilter}>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data">
                  <Input name="date" type="date" required defaultValue={date} />
                </Field>
                <Field label="Horário">
                  <Input name="time" type="time" required step={300} />
                </Field>
              </div>
              <SubmitButton pendingText="Agendando…">Confirmar agendamento</SubmitButton>
            </form>
          </FormSheet>
        )}
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Atendimentos" value={active.length} icon={<CalendarCheckIcon className="size-5" />} />
        <StatCard label="A atender" value={pending} icon={<ClockIcon className="size-5" />} />
        <StatCard label="Previsão do dia" value={formatCurrency(revenue)} icon={<WalletIcon className="size-5" />} />
      </div>

      <div className="my-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap gap-2">
          <Input type="date" name="data" defaultValue={date} className="w-auto" />
          {seesAll && (
            <NativeSelect name="barbeiro" defaultValue={query.barbeiro ?? ""} className="w-auto">
              <option value="">Todos os barbeiros</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          )}
          <Button variant="secondary">Filtrar</Button>
        </form>
        <PushOptIn vapidPublicKey={env.vapidPublicKey} />
      </div>

      {!seesAll && !ctx.ownBarber && (
        <Card className="mb-4 p-5 text-sm text-muted-foreground">
          Seu usuário ainda não está vinculado a um perfil de barbeiro. Peça ao dono.
        </Card>
      )}

      <div className="space-y-3">
        {bookings.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <CalendarCheckIcon className="size-8" />
            Nenhum agendamento neste dia.
          </Card>
        )}
        {bookings.map((booking) => (
          <Card key={booking.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="w-16 shrink-0 border-r pr-4 text-center">
                <p className="text-lg font-bold">{formatTime(booking.startsAt, tenant.timezone)}</p>
                <p className="text-xs text-muted-foreground">{formatTime(booking.endsAt, tenant.timezone)}</p>
              </div>
              <UserAvatar name={booking.customer.name} className="hidden sm:flex" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{booking.customer.name}</p>
                  <BookingStatusBadge booking={{ status: booking.status, isUpcoming: true }} />
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {booking.service.name} · {booking.barber.name} · {formatCurrency(booking.price)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {booking.customer.phone ?? "sem telefone"} · {booking.customer.user.email}
                </p>
              </div>
            </div>
            {booking.status === "CONFIRMED" && (
              <div className="flex gap-2">
                <form action={staffSetOutcome.bind(null, slug, booking.id, "COMPLETED", returnTo)}>
                  <Button size="sm" variant="secondary">Concluído</Button>
                </form>
                <form action={staffSetOutcome.bind(null, slug, booking.id, "NO_SHOW", returnTo)}>
                  <Button size="sm" variant="secondary">Faltou</Button>
                </form>
                <form action={staffCancelBooking.bind(null, slug, booking.id, returnTo)}>
                  <Button size="sm" variant="destructive">Cancelar</Button>
                </form>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
