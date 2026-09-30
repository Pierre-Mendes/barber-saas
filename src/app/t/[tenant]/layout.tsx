import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BrandStyle } from "@/components/brand-style"
import { TenantFooter } from "@/components/tenant-chrome"
import { getTenantByRouteKey } from "@/lib/tenancy/tenant"

type Params = { params: Promise<{ tenant: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tenant = await getTenantByRouteKey((await params).tenant)
  return tenant
    ? { title: `${tenant.name} — Agende seu horário`, description: tenant.description, icons: tenant.logoUrl ? [tenant.logoUrl] : undefined }
    : {}
}

/** Layout white-label: só a marca e a cor da barbearia, sem referência à plataforma nem a outras barbearias. */
export default async function TenantLayout({ children, params }: Params & { children: React.ReactNode }) {
  const tenant = await getTenantByRouteKey((await params).tenant)
  if (!tenant) {
    notFound()
  }
  return (
    <div className="flex min-h-screen flex-col">
      <BrandStyle color={tenant.primaryColor} />
      <div className="flex-1">{children}</div>
      <TenantFooter tenant={tenant} />
    </div>
  )
}
