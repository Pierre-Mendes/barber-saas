"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createBookingAction, getSlotsAction } from "@/app/actions/customer"

export interface WizardService {
  id: string
  name: string
  description: string
  imageUrl: string | null
  price: string
  durationMinutes: number
  barberIds: string[]
}

export interface WizardBarber {
  id: string
  name: string
  bio: string
  photoUrl: string | null
}

export interface WizardDay {
  date: string
  weekday: string
  label: string
}

interface Props {
  tenantId: string
  timeZone: string
  basePath: string
  isLoggedIn: boolean
  services: WizardService[]
  barbers: WizardBarber[]
  days: WizardDay[]
}

/** Assistente: serviço → profissional → dia → horário → confirmar. */
export function BookingWizard({ tenantId, timeZone, basePath, isLoggedIn, services, barbers, days }: Props) {
  const router = useRouter()
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [barberId, setBarberId] = useState<string | null>(null)
  const [date, setDate] = useState<string>(days[0]?.date ?? "")
  const [slots, setSlots] = useState<string[] | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [phone, setPhone] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loadingSlots, startLoadingSlots] = useTransition()
  const [submitting, startSubmitting] = useTransition()

  const service = services.find((s) => s.id === serviceId) ?? null
  const availableBarbers = service ? barbers.filter((b) => service.barberIds.includes(b.id)) : []
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" })

  useEffect(() => {
    setSlot(null)
    if (!serviceId || !barberId || !date) {
      setSlots(null)
      return
    }
    let cancelled = false
    startLoadingSlots(async () => {
      const result = await getSlotsAction({ tenantId, barberId, serviceId, date })
      if (!cancelled) {
        setSlots(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [tenantId, serviceId, barberId, date])

  function confirm() {
    if (!serviceId || !barberId || !slot) {
      return
    }
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    setError(null)
    startSubmitting(async () => {
      const result = await createBookingAction({ tenantId, barberId, serviceId, startsAt: slot, phone: phone || undefined })
      if (result.ok) {
        router.push(`${basePath}/reserva/${result.bookingId}`)
        return
      }
      setError(result.error)
      if (!result.needsLogin) {
        const refreshed = await getSlotsAction({ tenantId, barberId, serviceId, date })
        setSlots(refreshed)
        setSlot(null)
      }
    })
  }

  if (services.length === 0) {
    return <p className="card text-sm text-muted">Esta barbearia ainda não abriu a agenda online.</p>
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="label">1. Serviço</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setServiceId(s.id)
                  setBarberId(s.barberIds.length === 1 ? s.barberIds[0] : null)
                }}
                className={`card w-full text-left transition ${serviceId === s.id ? "border-brand" : "hover:border-muted"}`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{s.name}</span>
                  <span className="font-semibold text-brand">{s.price}</span>
                </div>
                <p className="text-xs text-muted">
                  {s.durationMinutes} min{s.description && ` • ${s.description}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {service && (
        <section>
          <h2 className="label">2. Profissional</h2>
          <div className="flex flex-wrap gap-3">
            {availableBarbers.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBarberId(b.id)}
                className={`card flex items-center gap-3 ${barberId === b.id ? "border-brand" : "hover:border-muted"}`}
              >
                {b.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-line">{b.name.charAt(0)}</span>
                )}
                <span className="font-medium">{b.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {service && barberId && (
        <section>
          <h2 className="label">3. Dia e horário</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setDate(d.date)}
                className={`flex min-w-20 shrink-0 flex-col whitespace-nowrap items-center rounded-lg border px-3 py-2 text-sm ${
                  date === d.date ? "border-brand bg-brand text-white" : "border-line bg-card"
                }`}
              >
                <span className="capitalize">{d.weekday.replace(".", "")}</span>
                <span className="font-semibold">{d.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-3">
            {loadingSlots && <p className="text-sm text-muted">Carregando horários…</p>}
            {!loadingSlots && slots?.length === 0 && <p className="text-sm text-muted">Sem horários livres nesse dia.</p>}
            {!loadingSlots && slots && slots.length > 0 && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`rounded-lg border py-2 text-sm ${slot === s ? "border-brand bg-brand" : "border-line bg-card"}`}
                  >
                    {timeFormatter.format(new Date(s))}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {service && barberId && slot && (
        <section className="card space-y-3">
          <h2 className="label">4. Confirmar</h2>
          <p className="text-sm">
            <b>{service.name}</b> com <b>{barbers.find((b) => b.id === barberId)?.name}</b> —{" "}
            {new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "full", timeStyle: "short" }).format(new Date(slot))}
          </p>
          {isLoggedIn && (
            <div>
              <label className="label" htmlFor="phone">Celular (opcional)</label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
            </div>
          )}
          {error && <p className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
          <button type="button" className="btn-primary w-full" disabled={submitting} onClick={confirm}>
            {!isLoggedIn ? "Entrar para confirmar" : submitting ? "Confirmando…" : `Confirmar • ${service.price}`}
          </button>
        </section>
      )}
    </div>
  )
}
