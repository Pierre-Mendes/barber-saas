import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { requirePanel } from "@/lib/auth/guards"
import { env } from "@/lib/env"
import { updateSettings } from "../actions"

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: FlashParams }) {
  const { slug } = await params
  const { tenant } = await requirePanel(slug, "settings.manage")

  return (
    <div className="space-y-6">
      <Flash {...await searchParams} />
      <h1 className="text-2xl font-bold">Personalização</h1>
      <form action={updateSettings.bind(null, slug)} className="space-y-6">
        <section className="card grid gap-4 sm:grid-cols-2">
          <h2 className="label sm:col-span-2">Identidade</h2>
          <Field label="Nome"><input name="name" defaultValue={tenant.name} required className="input" /></Field>
          <Field label="Cor principal"><input name="primaryColor" type="color" defaultValue={tenant.primaryColor} className="h-10 w-full rounded-lg" /></Field>
          <Field label="Logo (URL)"><input name="logoUrl" defaultValue={tenant.logoUrl ?? ""} className="input" /></Field>
          <Field label="Banner (URL)"><input name="bannerUrl" defaultValue={tenant.bannerUrl ?? ""} className="input" /></Field>
          <div className="sm:col-span-2">
            <Field label="Descrição"><textarea name="description" defaultValue={tenant.description} rows={3} className="input" /></Field>
          </div>
          <Field label="Endereço"><input name="address" defaultValue={tenant.address} className="input" /></Field>
          <Field label="Telefones" hint="Separe por vírgula."><input name="phones" defaultValue={tenant.phones.join(", ")} className="input" /></Field>
        </section>

        <section className="card grid gap-4 sm:grid-cols-2">
          <h2 className="label sm:col-span-2">Seu link</h2>
          <Field label="Endereço do link" hint={`Fica ${slug}.${env.rootDomain}. Mudar quebra links já divulgados.`}>
            <input name="slug" defaultValue={tenant.slug} required className="input" />
          </Field>
          <Field
            label="Domínio próprio (opcional)"
            hint="Ex.: agenda.suabarbearia.com.br — crie um CNAME apontando para a plataforma."
          >
            <input name="customDomain" defaultValue={tenant.customDomain ?? ""} className="input" />
          </Field>
        </section>

        <section className="card grid gap-4 sm:grid-cols-3">
          <h2 className="label sm:col-span-3">Regras da agenda</h2>
          <Field label="Fuso horário"><input name="timezone" defaultValue={tenant.timezone} className="input" /></Field>
          <Field label="Intervalo entre horários (min)"><input name="slotIntervalMinutes" type="number" defaultValue={tenant.slotIntervalMinutes} className="input" /></Field>
          <Field label="Antecedência mínima (min)"><input name="minBookingLeadMin" type="number" defaultValue={tenant.minBookingLeadMin} className="input" /></Field>
          <Field label="Cancelamento até (h antes)"><input name="minCancelHours" type="number" defaultValue={tenant.minCancelHours} className="input" /></Field>
          <Field label="Agenda aberta por (dias)"><input name="bookingWindowDays" type="number" defaultValue={tenant.bookingWindowDays} className="input" /></Field>
        </section>

        <SubmitButton>Salvar configurações</SubmitButton>
      </form>
    </div>
  )
}
