import { PageHeader } from "@/components/admin/page-header"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input, Textarea } from "@/components/ui/input"
import { requirePanel } from "@/lib/auth/guards"
import { tenantFallbackCover } from "@/lib/catalog"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"
import { updateSettings } from "../actions"

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: FlashParams }) {
  const { slug } = await params
  const { tenant } = await requirePanel(slug, "settings.manage")

  return (
    <>
      <Flash {...await searchParams} />
      <PageHeader title="Personalização" description="Como sua barbearia aparece para os clientes." />
      <form action={updateSettings.bind(null, slug)} className="space-y-6">
        <Card className="overflow-hidden">
          <div className="relative h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tenant.bannerUrl ?? tenantFallbackCover(tenant.id)} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
          <CardHeader>
            <CardTitle>Identidade</CardTitle>
            <CardDescription>Nome, cores e imagens da sua página.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input name="name" defaultValue={tenant.name} required />
            </Field>
            <Field label="Cor principal">
              <Input name="primaryColor" type="color" defaultValue={tenant.primaryColor} className="cursor-pointer" />
            </Field>
            <Field label="Logo (URL)">
              <Input name="logoUrl" defaultValue={tenant.logoUrl ?? ""} placeholder="https://…" />
            </Field>
            <Field label="Capa (URL)">
              <Input name="bannerUrl" defaultValue={tenant.bannerUrl ?? ""} placeholder="https://…" />
            </Field>
            <Field label="Sobre nós" className="sm:col-span-2">
              <Textarea name="description" defaultValue={tenant.description} rows={3} />
            </Field>
            <Field label="Endereço">
              <Input name="address" defaultValue={tenant.address} />
            </Field>
            <Field label="Telefones" hint="Separe por vírgula.">
              <Input name="phones" defaultValue={tenant.phones.join(", ")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seu link</CardTitle>
            <CardDescription>
              Hoje: <span className="text-primary">{tenantPublicUrlFor(tenant)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Endereço do link" hint="Mudar quebra links já divulgados.">
              <Input name="slug" defaultValue={tenant.slug} required />
            </Field>
            <Field label="Domínio próprio (opcional)" hint="Ex.: agenda.suabarbearia.com.br, com um CNAME apontando para a plataforma.">
              <Input name="customDomain" defaultValue={tenant.customDomain ?? ""} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regras da agenda</CardTitle>
            <CardDescription>Valem para todos os barbeiros.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Fuso horário">
              <Input name="timezone" defaultValue={tenant.timezone} />
            </Field>
            <Field label="Intervalo entre horários (min)">
              <Input name="slotIntervalMinutes" type="number" defaultValue={tenant.slotIntervalMinutes} />
            </Field>
            <Field label="Antecedência mínima (min)">
              <Input name="minBookingLeadMin" type="number" defaultValue={tenant.minBookingLeadMin} />
            </Field>
            <Field label="Cancelamento até (horas antes)">
              <Input name="minCancelHours" type="number" defaultValue={tenant.minCancelHours} />
            </Field>
            <Field label="Agenda aberta por (dias)">
              <Input name="bookingWindowDays" type="number" defaultValue={tenant.bookingWindowDays} />
            </Field>
          </CardContent>
        </Card>

        <SubmitButton size="lg">Salvar alterações</SubmitButton>
      </form>
    </>
  )
}
