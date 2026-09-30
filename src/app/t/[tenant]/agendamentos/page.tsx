import { notFound, redirect } from "next/navigation"
import { currentUser } from "@/auth"
import { BookingsSections } from "@/components/bookings-sections"
import { TenantHeader } from "@/components/tenant-chrome"
import { getTenantByRouteKey, tenantBasePath } from "@/lib/tenancy/tenant"

/** Agendamentos do cliente só nesta barbearia (a página white-label nunca mostra outras). */
export default async function TenantBookingsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await getTenantByRouteKey((await params).tenant)
  if (!tenant) {
    notFound()
  }
  const basePath = await tenantBasePath(tenant)
  const user = await currentUser()
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`${basePath}/agendamentos`)}`)
  }
  return (
    <>
      <TenantHeader tenant={tenant} basePath={basePath} />
      <main className="mx-auto max-w-3xl px-5 py-6">
        <BookingsSections
          where={{ tenantId: tenant.id, customer: { userId: user.id } }}
          emptyHref={basePath || "/"}
          emptyLabel="Agendar agora"
        />
      </main>
    </>
  )
}
