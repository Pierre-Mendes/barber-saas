import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { BookingWizard, type WizardBarber, type WizardDay, type WizardService } from "@/components/booking-wizard"
import { db } from "@/lib/db"
import { addDays, formatDateTime, toLocalDate, zonedToUtc } from "@/lib/scheduling/time"
import { getTenantByRouteKey, tenantBasePath } from "@/lib/tenancy/tenant"

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export default async function TenantPage({ params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await getTenantByRouteKey((await params).tenant)
  if (!tenant) {
    notFound()
  }
  const [base, session, services, barbers] = await Promise.all([
    tenantBasePath(tenant),
    auth(),
    db.service.findMany({
      where: { tenantId: tenant.id, active: true },
      include: { barbers: { where: { barber: { active: true } }, select: { barberId: true } } },
      orderBy: { name: "asc" },
    }),
    db.barber.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { name: "asc" } }),
  ])

  const wizardServices: WizardService[] = services
    .filter((service) => service.barbers.length > 0)
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      imageUrl: service.imageUrl,
      price: currency.format(Number(service.price)),
      durationMinutes: service.durationMinutes,
      barberIds: service.barbers.map((b) => b.barberId),
    }))
  const wizardBarbers: WizardBarber[] = barbers.map((barber) => ({
    id: barber.id,
    name: barber.name,
    bio: barber.bio,
    photoUrl: barber.photoUrl,
  }))

  const today = toLocalDate(new Date(), tenant.timezone)
  const days: WizardDay[] = Array.from({ length: Math.min(14, tenant.bookingWindowDays + 1) }, (_, i) => {
    const date = addDays(today, i)
    const noon = zonedToUtc(date, 12 * 60, tenant.timezone)
    return {
      date,
      weekday: formatDateTime(noon, tenant.timezone, { weekday: "short", dateStyle: undefined, timeStyle: undefined }),
      label: formatDateTime(noon, tenant.timezone, { day: "2-digit", month: "short", dateStyle: undefined, timeStyle: undefined }),
    }
  })

  return (
    <div className="space-y-6">
      {tenant.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tenant.bannerUrl} alt="" className="h-48 w-full rounded-xl object-cover" />
      )}
      <section>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        {tenant.address && <p className="text-sm text-muted">📍 {tenant.address}</p>}
        {tenant.description && <p className="mt-3 text-sm">{tenant.description}</p>}
        {tenant.phones.length > 0 && <p className="mt-2 text-sm text-muted">📞 {tenant.phones.join(" • ")}</p>}
      </section>

      <BookingWizard
        tenantId={tenant.id}
        timeZone={tenant.timezone}
        basePath={base}
        isLoggedIn={Boolean(session?.user)}
        services={wizardServices}
        barbers={wizardBarbers}
        days={days}
      />
    </div>
  )
}
