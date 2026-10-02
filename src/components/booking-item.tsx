"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlusIcon, MapPinIcon } from "lucide-react"
import { toast } from "sonner"
import { cancelMyBookingAction } from "@/app/actions/customer"
import { BookingSummary } from "@/components/booking-summary"
import { PhoneItem } from "@/components/phone-item"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { BookingCardData } from "@/lib/booking/view"
import { cn } from "@/lib/utils"

const STATUS: Record<BookingCardData["status"], { label: string; variant: "default" | "secondary" | "destructive" | "warning" }> = {
  CONFIRMED: { label: "Confirmado", variant: "default" },
  COMPLETED: { label: "Finalizado", variant: "secondary" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
  NO_SHOW: { label: "Não compareceu", variant: "warning" },
}

export function BookingStatusBadge({ booking }: { booking: Pick<BookingCardData, "status" | "isUpcoming"> }) {
  const status = booking.status === "CONFIRMED" && !booking.isUpcoming ? STATUS.COMPLETED : STATUS[booking.status]
  return <Badge variant={status.variant}>{status.label}</Badge>
}

function parts(iso: string, timeZone: string) {
  const date = new Date(iso)
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone, ...options }).format(date)
  return { month: format({ month: "long" }), day: format({ day: "2-digit" }), time: format({ hour: "2-digit", minute: "2-digit" }) }
}

export function CalendarLinks({ calendar }: { calendar: BookingCardData["calendar"] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={calendar.google} target="_blank" rel="noreferrer">Google</a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={calendar.outlook} target="_blank" rel="noreferrer">Outlook</a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={calendar.ics}>Apple (.ics)</a>
      </Button>
    </div>
  )
}

export function CancelBookingDialog({
  bookingId,
  token,
  onCancelled,
  className,
}: {
  bookingId: string
  /** Segredo do link do e-mail (quem agendou sem conta). */
  token?: string
  onCancelled?: () => void
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" className={cn("w-full", className)}>
          Cancelar reserva
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Você deseja cancelar sua reserva?</DialogTitle>
          <DialogDescription>O horário será liberado para outra pessoa. Essa ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" className="flex-1">
              Voltar
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await cancelMyBookingAction(bookingId, token)
                if (!result.ok) {
                  toast.error(result.error ?? "Erro ao cancelar.")
                  return
                }
                toast.success("Reserva cancelada.")
                onCancelled?.()
                router.refresh()
              })
            }
          >
            {pending ? "Cancelando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Card de agendamento + painel lateral com detalhes, mapa, agenda e cancelamento (como no projeto base). */
export function BookingItem({ booking, className }: { booking: BookingCardData; className?: string }) {
  const [open, setOpen] = useState(false)
  const when = parts(booking.startsAt, booking.timeZone)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.barbershop.name} ${booking.barbershop.address}`)}`

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={cn("w-full min-w-[90%] cursor-pointer text-left", className)}>
          <Card className="flex justify-between transition hover:border-primary/50">
            <div className="flex min-w-0 flex-col gap-2 py-5 pl-5">
              <BookingStatusBadge booking={booking} />
              <h3 className="truncate font-semibold">{booking.serviceName}</h3>
              <div className="flex items-center gap-2">
                <UserAvatar name={booking.barbershop.name} image={booking.barbershop.logoUrl} className="size-6 text-[10px]" />
                <p className="truncate text-sm">{booking.barbershop.name}</p>
              </div>
            </div>
            <div className="flex min-w-24 flex-col items-center justify-center border-l-2 px-5">
              <p className="text-sm capitalize">{when.month}</p>
              <p className="text-2xl font-semibold">{when.day}</p>
              <p className="text-sm">{when.time}</p>
            </div>
          </Card>
        </button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Informações da reserva</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 p-5">
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="relative block h-[180px] w-full overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/demo/map.svg" alt="" className="absolute inset-0 size-full object-cover" />
            <MapPinIcon className="absolute top-8 left-1/2 size-9 -translate-x-1/2 fill-primary text-background drop-shadow-lg" />
            <Card className="absolute right-4 bottom-3 left-4 z-10 flex items-center gap-3 px-4 py-3">
              <UserAvatar name={booking.barbershop.name} image={booking.barbershop.logoUrl} />
              <div className="min-w-0">
                <h3 className="truncate font-bold">{booking.barbershop.name}</h3>
                <p className="truncate text-xs text-muted-foreground">{booking.barbershop.address}</p>
              </div>
            </Card>
          </a>

          <BookingStatusBadge booking={booking} />
          <BookingSummary
            data={{
              serviceName: booking.serviceName,
              price: booking.price,
              startsAt: booking.startsAt,
              timeZone: booking.timeZone,
              barberName: booking.barberName,
              barbershopName: booking.barbershop.name,
            }}
          />

          {booking.isUpcoming && (
            <div className="space-y-2">
              <p className="section-title flex items-center gap-2">
                <CalendarPlusIcon className="size-4" /> Salvar na agenda
              </p>
              <CalendarLinks calendar={booking.calendar} />
            </div>
          )}

          {booking.barbershop.phones.length > 0 && (
            <div className="space-y-3">
              {booking.barbershop.phones.map((phone) => (
                <PhoneItem key={phone} phone={phone} />
              ))}
            </div>
          )}

          {booking.isUpcoming && !booking.canCancel && (
            <p className="text-xs text-muted-foreground">
              {booking.cancelDeadline ? "O prazo para cancelar online já passou. Fale com a barbearia." : booking.cancellationText}
            </p>
          )}
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">
              Voltar
            </Button>
          </SheetClose>
          {booking.canCancel && <CancelBookingDialog bookingId={booking.id} className="flex-1" onCancelled={() => setOpen(false)} />}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
