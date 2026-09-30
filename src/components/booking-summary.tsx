import { Card, CardContent } from "@/components/ui/card"

export interface BookingSummaryData {
  serviceName: string
  price: string
  startsAt: string
  timeZone: string
  barberName: string
  barbershopName: string
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}

/** Resumo do agendamento (serviço, data, horário, profissional, barbearia). */
export function BookingSummary({ data }: { data: BookingSummaryData }) {
  const date = new Date(data.startsAt)
  const day = new Intl.DateTimeFormat("pt-BR", { timeZone: data.timeZone, day: "numeric", month: "long", weekday: "long" }).format(date)
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: data.timeZone, hour: "2-digit", minute: "2-digit" }).format(date)
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold">{data.serviceName}</h2>
          <p className="text-sm font-bold">{data.price}</p>
        </div>
        <Row label="Data" value={day.charAt(0).toUpperCase() + day.slice(1)} />
        <Row label="Horário" value={time} />
        <Row label="Profissional" value={data.barberName} />
        <Row label="Barbearia" value={data.barbershopName} />
      </CardContent>
    </Card>
  )
}
