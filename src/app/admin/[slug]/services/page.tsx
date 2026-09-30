import { ClockIcon } from "lucide-react"
import { FormSheet } from "@/components/admin/form-sheet"
import { PageHeader } from "@/components/admin/page-header"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Field, Input } from "@/components/ui/input"
import { ImageField } from "@/components/admin/image-field"
import { requirePanel } from "@/lib/auth/guards"
import { isStorageConfigured } from "@/lib/storage"
import { serviceFallbackImage } from "@/lib/catalog"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/utils"
import { createService, updateService } from "../actions"

type ServiceFormValues = { name: string; description: string; price: unknown; durationMinutes: number; imageUrl: string | null }

function ServiceFields({ service, uploadEnabled }: { service?: ServiceFormValues; uploadEnabled: boolean }) {
  return (
    <>
      <Field label="Nome">
        <Input name="name" required defaultValue={service?.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço (R$)">
          <Input name="price" required defaultValue={service ? String(service.price) : ""} placeholder="45,00" inputMode="decimal" />
        </Field>
        <Field label="Duração (min)">
          <Input name="durationMinutes" required type="number" min={5} step={5} defaultValue={service?.durationMinutes ?? 30} />
        </Field>
      </div>
      <Field label="Descrição">
        <Input name="description" defaultValue={service?.description} />
      </Field>
      <ImageField
        label="Imagem"
        fileName="imageFile"
        urlName="imageUrl"
        currentUrl={service?.imageUrl}
        uploadEnabled={uploadEnabled}
        hint="Opcional. Sem imagem, usamos uma ilustração."
      />
    </>
  )
}

export default async function ServicesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: FlashParams }) {
  const { slug } = await params
  const ctx = await requirePanel(slug, "services.manage")
  const uploadEnabled = isStorageConfigured()
  const services = await db.service.findMany({
    where: { tenantId: ctx.tenant.id },
    include: { _count: { select: { barbers: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  return (
    <>
      <Flash {...await searchParams} />
      <PageHeader title="Serviços" description="O que aparece para o cliente na sua página.">
        <FormSheet triggerLabel="Novo serviço" title="Novo serviço" description="Todos os barbeiros ativos passam a oferecer o serviço.">
          <form action={createService.bind(null, slug)} className="grid gap-4">
            <ServiceFields uploadEnabled={uploadEnabled} />
            <SubmitButton>Adicionar serviço</SubmitButton>
          </form>
        </FormSheet>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.id} className="flex gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={service.imageUrl ?? serviceFallbackImage(service.name)} alt="" className="size-24 shrink-0 rounded-lg object-cover" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{service.name}</p>
                {!service.active && <Badge variant="secondary">inativo</Badge>}
              </div>
              <p className="line-clamp-1 text-sm text-muted-foreground">{service.description}</p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <span className="font-bold text-primary">{formatCurrency(service.price)}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="size-3" /> {service.durationMinutes} min · {service._count.barbers} barbeiros
                </span>
              </p>
              <div className="mt-auto pt-2">
                <FormSheet edit triggerLabel="Editar" title={`Editar ${service.name}`}>
                  <form action={updateService.bind(null, slug, service.id)} className="grid gap-4">
                    <ServiceFields service={service} uploadEnabled={uploadEnabled} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="active" defaultChecked={service.active} className="size-4 accent-[var(--brand)]" /> Ativo
                    </label>
                    <SubmitButton>Salvar</SubmitButton>
                  </form>
                </FormSheet>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
