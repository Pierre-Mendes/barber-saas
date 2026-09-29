import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { requirePanel } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { createService, updateService } from "../actions"

function ServiceFields({ service }: { service?: { name: string; description: string; price: unknown; durationMinutes: number; imageUrl: string | null } }) {
  return (
    <>
      <input name="name" required defaultValue={service?.name} placeholder="Nome" className="input" />
      <input name="price" required defaultValue={service ? String(service.price) : ""} placeholder="Preço (ex: 45,00)" inputMode="decimal" className="input" />
      <input name="durationMinutes" required type="number" min={5} step={5} defaultValue={service?.durationMinutes ?? 30} className="input" title="Duração (min)" />
      <input name="imageUrl" defaultValue={service?.imageUrl ?? ""} placeholder="URL da imagem (opcional)" className="input" />
      <input name="description" defaultValue={service?.description} placeholder="Descrição" className="input sm:col-span-2" />
    </>
  )
}

export default async function ServicesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: FlashParams }) {
  const { slug } = await params
  const ctx = await requirePanel(slug, "services.manage")
  const services = await db.service.findMany({
    where: { tenantId: ctx.tenant.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  return (
    <div className="space-y-6">
      <Flash {...await searchParams} />
      <h1 className="text-2xl font-bold">Serviços</h1>
      {services.map((service) => (
        <form key={service.id} action={updateService.bind(null, slug, service.id)} className="card grid gap-2 sm:grid-cols-4">
          <ServiceFields service={service} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={service.active} /> Ativo
          </label>
          <SubmitButton className="btn-secondary">Salvar</SubmitButton>
        </form>
      ))}
      <form action={createService.bind(null, slug)} className="card grid gap-2 sm:grid-cols-4">
        <h2 className="label sm:col-span-4">Novo serviço</h2>
        <ServiceFields />
        <SubmitButton className="btn-primary sm:col-span-2">Adicionar serviço</SubmitButton>
      </form>
    </div>
  )
}
