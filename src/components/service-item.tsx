"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ClockIcon } from "lucide-react"
import { toast } from "sonner"
import { createBookingAction, getSlotsAction } from "@/app/actions/customer"
import { BookingSummary } from "@/components/booking-summary"
import { SignInDialogContent } from "@/components/sign-in-dialog"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface ServiceItemData {
  id: string
  name: string
  description: string
  imageUrl: string
  price: string
  durationMinutes: number
  barbers: { id: string; name: string; photoUrl: string | null; weekdays: number[] }[]
}

interface ServiceItemProps {
  service: ServiceItemData
  tenant: { id: string; name: string; timeZone: string }
  today: string
  lastDay: string
  basePath: string
  isLoggedIn: boolean
  googleEnabled: boolean
}

/** Card de serviço + painel "Fazer reserva" (profissional → dia → horário → confirmar). */
export function ServiceItem({ service, tenant, today, lastDay, basePath, isLoggedIn, googleEnabled }: ServiceItemProps) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [barberId, setBarberId] = useState<string | undefined>(service.barbers.length === 1 ? service.barbers[0].id : undefined)
  const [day, setDay] = useState<string | undefined>()
  const [slots, setSlots] = useState<string[] | null>(null)
  const [slot, setSlot] = useState<string | undefined>()
  const [phone, setPhone] = useState("")
  const [loadingSlots, startLoadingSlots] = useTransition()
  const [submitting, startSubmitting] = useTransition()

  const barber = service.barbers.find((b) => b.id === barberId)
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: tenant.timeZone, hour: "2-digit", minute: "2-digit" })

  useEffect(() => {
    setSlot(undefined)
    if (!barberId || !day) {
      setSlots(null)
      return
    }
    let cancelled = false
    startLoadingSlots(async () => {
      const result = await getSlotsAction({ tenantId: tenant.id, barberId, serviceId: service.id, date: day })
      if (!cancelled) {
        setSlots(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [tenant.id, service.id, barberId, day])

  function reset() {
    setDay(undefined)
    setSlot(undefined)
    setSlots(null)
    if (service.barbers.length > 1) {
      setBarberId(undefined)
    }
  }

  function confirm() {
    if (!barberId || !slot) {
      return
    }
    startSubmitting(async () => {
      const result = await createBookingAction({
        tenantId: tenant.id,
        barberId,
        serviceId: service.id,
        startsAt: slot,
        phone: phone || undefined,
      })
      if (result.ok) {
        toast.success("Reserva confirmada! Enviamos os detalhes para o seu e-mail.")
        setSheetOpen(false)
        router.push(`${basePath}/reserva/${result.bookingId}`)
        return
      }
      toast.error(result.error)
      if (result.needsLogin) {
        setSheetOpen(false)
        setSignInOpen(true)
        return
      }
      if (day) {
        setSlots(await getSlotsAction({ tenantId: tenant.id, barberId, serviceId: service.id, date: day }))
        setSlot(undefined)
      }
    })
  }

  return (
    <>
      <Card className="flex items-center gap-3 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={service.imageUrl} alt={service.name} className="size-[110px] shrink-0 rounded-lg object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 self-stretch py-1">
          <h3 className="text-sm font-semibold">{service.name}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
          <div className="mt-auto flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-primary">{service.price}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon className="size-3" /> {service.durationMinutes} min
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (isLoggedIn ? setSheetOpen(true) : setSignInOpen(true))}
            >
              Reservar
            </Button>
          </div>
        </div>
      </Card>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) {
            reset()
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Fazer reserva</SheetTitle>
            <SheetDescription>
              {service.name} · {service.durationMinutes} min
            </SheetDescription>
          </SheetHeader>

          {service.barbers.length > 1 && (
            <div className="border-b p-5">
              <p className="section-title">Profissional</p>
              <div className="scrollbar-none flex gap-3 overflow-x-auto">
                {service.barbers.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBarberId(b.id)
                      setDay(undefined)
                    }}
                    className="flex w-20 shrink-0 cursor-pointer flex-col items-center gap-2"
                  >
                    <UserAvatar
                      name={b.name}
                      image={b.photoUrl}
                      className={cn("size-14 ring-2 ring-transparent ring-offset-2 ring-offset-background transition", barberId === b.id && "ring-primary")}
                    />
                    <span className={cn("w-full truncate text-center text-xs", barberId === b.id && "font-bold text-primary")}>{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {barber && (
            <div className="border-b p-5">
              <Calendar
                key={barber.id}
                selected={day}
                onSelect={setDay}
                minDate={today}
                maxDate={lastDay}
                enabledWeekdays={barber.weekdays}
              />
            </div>
          )}

          {barber && day && (
            <div className="scrollbar-none flex gap-3 overflow-x-auto border-b p-5">
              {loadingSlots && <p className="text-xs text-muted-foreground">Carregando horários…</p>}
              {!loadingSlots && slots?.length === 0 && (
                <p className="text-xs text-muted-foreground">Não há horários disponíveis para este dia.</p>
              )}
              {!loadingSlots &&
                slots?.map((s) => (
                  <Button
                    key={s}
                    variant={slot === s ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setSlot(s)}
                  >
                    {timeFormatter.format(new Date(s))}
                  </Button>
                ))}
            </div>
          )}

          {barber && slot && (
            <div className="space-y-4 p-5">
              <BookingSummary
                data={{
                  serviceName: service.name,
                  price: service.price,
                  startsAt: slot,
                  timeZone: tenant.timeZone,
                  barberName: barber.name,
                  barbershopName: tenant.name,
                }}
              />
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Seu celular (opcional)"
                inputMode="tel"
                aria-label="Celular"
              />
            </div>
          )}

          <SheetFooter>
            <Button className="w-full" onClick={confirm} disabled={!slot || submitting}>
              {submitting ? "Confirmando…" : "Confirmar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent>
          <SignInDialogContent googleEnabled={googleEnabled} />
        </DialogContent>
      </Dialog>
    </>
  )
}
