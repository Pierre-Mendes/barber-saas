import { PageHeader } from "@/components/admin/page-header"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input"
import { ImageField } from "@/components/admin/image-field"
import { requirePanel } from "@/lib/auth/guards"
import { describeCancellationPolicy } from "@/lib/booking/policy"
import { isStorageConfigured } from "@/lib/storage"
import { tenantFallbackCover } from "@/lib/catalog"
import { tenantPublicUrlFor } from "@/lib/tenancy/urls"
import { updateSettings } from "../actions"

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: FlashParams }) {
  const { slug } = await params
  const { tenant } = await requirePanel(slug, "settings.manage")
  const uploadEnabled = isStorageConfigured()

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
            <ImageField label="Logo" fileName="logoFile" urlName="logoUrl" currentUrl={tenant.logoUrl} uploadEnabled={uploadEnabled} hint="Quadrada, até 5 MB (JPG, PNG, WebP ou AVIF)." />
            <ImageField label="Capa" fileName="bannerFile" urlName="bannerUrl" currentUrl={tenant.bannerUrl} uploadEnabled={uploadEnabled} aspect="wide" hint="Horizontal (ex.: 1600×900), até 5 MB." />
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
            <Field label="Agenda aberta por (dias)">
              <Input name="bookingWindowDays" type="number" defaultValue={tenant.bookingWindowDays} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cancelamento pelo cliente</CardTitle>
            <CardDescription>
              Como o cliente pode cancelar pela internet. A equipe sempre pode cancelar pelo painel. Hoje:{" "}
              <span className="text-foreground">{describeCancellationPolicy(tenant)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Regra" htmlFor="cancellationPolicy">
              <NativeSelect id="cancellationPolicy" name="cancellationPolicy" defaultValue={tenant.cancellationPolicy}>
                <option value="HOURS_BEFORE_START">Até X horas antes do horário</option>
                <option value="WINDOW_AFTER_BOOKING">Até X minutos depois de agendar</option>
                <option value="NONE">Não pode cancelar online</option>
              </NativeSelect>
            </Field>
            <Field label="Horas antes do horário" hint="Usado na regra “antes do horário”.">
              <Input name="minCancelHours" type="number" min={0} max={168} defaultValue={tenant.minCancelHours} />
            </Field>
            <Field label="Minutos depois de agendar" hint="Usado na regra “depois de agendar”. Ex.: 60 = 1 hora.">
              <Input name="cancelWindowMinutes" type="number" min={0} max={10080} defaultValue={tenant.cancelWindowMinutes} />
            </Field>
          </CardContent>
        </Card>

        <SubmitButton size="lg">Salvar alterações</SubmitButton>
      </form>
    </>
  )
}
