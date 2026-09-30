import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeftIcon, MapPinIcon, NavigationIcon, ScissorsIcon } from "lucide-react"
import { auth } from "@/auth"
import { PhoneItem } from "@/components/phone-item"
import { ServiceItem, type ServiceItemData } from "@/components/service-item"
import { TenantMenu } from "@/components/tenant-chrome"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { serviceFallbackImage, tenantFallbackCover } from "@/lib/catalog"
import { db } from "@/lib/db"
import { addDays, toLocalDate } from "@/lib/scheduling/time"
import { getTenantByRouteKey, tenantBasePath } from "@/lib/tenancy/tenant"
import { formatCurrency } from "@/lib/utils"

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

export default async function TenantPage({ params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await getTenantByRouteKey((await params).tenant)
  if (!tenant) {
    notFound()
  }
  const [basePath, session, services, barbers, completedCount] = await Promise.all([
    tenantBasePath(tenant),
    auth(),
    db.service.findMany({
      where: { tenantId: tenant.id, active: true },
      include: { barbers: { where: { barber: { active: true } }, select: { barberId: true } } },
      orderBy: { price: "asc" },
    }),
    db.barber.findMany({
      where: { tenantId: tenant.id, active: true },
      include: { workingHours: { select: { weekday: true } } },
      orderBy: { name: "asc" },
    }),
    db.booking.count({ where: { tenantId: tenant.id, status: "COMPLETED" } }),
  ])

  const barberById = new Map(
    barbers.map((barber) => [
      barber.id,
      { id: barber.id, name: barber.name, photoUrl: barber.photoUrl, weekdays: [...new Set(barber.workingHours.map((w) => w.weekday))] },
    ]),
  )
  const items: ServiceItemData[] = services
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      imageUrl: service.imageUrl ?? serviceFallbackImage(service.name),
      price: formatCurrency(service.price),
      durationMinutes: service.durationMinutes,
      barbers: service.barbers.flatMap((b) => barberById.get(b.barberId) ?? []),
    }))
    .filter((service) => service.barbers.length > 0)

  const today = toLocalDate(new Date(), tenant.timezone)
  const lastDay = addDays(today, tenant.bookingWindowDays)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tenant.name} ${tenant.address}`)}`

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative h-[250px] w-full md:h-[320px] md:overflow-hidden md:rounded-b-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tenant.bannerUrl ?? tenantFallbackCover(tenant.id)} alt={tenant.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
        {basePath && (
          <Button size="icon" variant="secondary" className="absolute top-4 left-4" asChild>
            <Link href="/" aria-label="Voltar">
              <ChevronLeftIcon />
            </Link>
          </Button>
        )}
        <TenantMenu basePath={basePath} triggerClassName="absolute top-4 right-4 bg-background/70 backdrop-blur" />
      </div>

      <div className="border-b p-5">
        <div className="flex items-center gap-3">
          <UserAvatar name={tenant.name} image={tenant.logoUrl} className="size-12" />
          <h1 className="text-xl font-bold">{tenant.name}</h1>
        </div>
        {tenant.address && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 hover:underline">
            <MapPinIcon className="size-[18px] text-primary" />
            <p className="text-sm">{tenant.address}</p>
          </a>
        )}
        <div className="mt-2 flex items-center gap-2">
          <ScissorsIcon className="size-[18px] text-primary" />
          <p className="text-sm">
            {completedCount} {completedCount === 1 ? "atendimento realizado" : "atendimentos realizados"}
          </p>
        </div>
      </div>

      {tenant.description && (
        <div className="space-y-2 border-b p-5">
          <h2 className="section-title mb-0">Sobre nós</h2>
          <p className="text-sm text-justify">{tenant.description}</p>
        </div>
      )}

      {barbers.length > 0 && (
        <div className="border-b p-5">
          <h2 className="section-title">Profissionais</h2>
          <div className="scrollbar-none flex gap-4 overflow-x-auto">
            {barbers.map((barber) => (
              <div key={barber.id} className="flex w-20 shrink-0 flex-col items-center gap-2">
                <UserAvatar name={barber.name} image={barber.photoUrl} className="size-14" />
                <span className="w-full truncate text-center text-xs">{barber.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 border-b p-5">
        <h2 className="section-title mb-0">Serviços</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Esta barbearia ainda não abriu a agenda online.</p>}
        {items.map((service) => (
          <ServiceItem
            key={service.id}
            service={service}
            tenant={{ id: tenant.id, name: tenant.name, timeZone: tenant.timezone }}
            today={today}
            lastDay={lastDay}
            basePath={basePath}
            isLoggedIn={Boolean(session?.user)}
            googleEnabled={googleEnabled}
          />
        ))}
      </div>

      <div className="space-y-3 p-5">
        <h2 className="section-title mb-0">Contato</h2>
        {tenant.phones.map((phone) => (
          <PhoneItem key={phone} phone={phone} />
        ))}
        {tenant.address && (
          <Button variant="outline" className="w-full" asChild>
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              <NavigationIcon /> Como chegar
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
