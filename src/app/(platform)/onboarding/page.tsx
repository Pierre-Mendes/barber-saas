import { redirect } from "next/navigation"
import { z } from "zod"
import { SubmitButton } from "@/components/submit-button"
import { requireUser } from "@/lib/auth/guards"
import { isPrismaUniqueViolation } from "@/lib/booking/service"
import { db } from "@/lib/db"
import { isValidSlug } from "@/lib/tenancy/host"

export const metadata = { title: "Cadastrar barbearia" }

const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().refine(isValidSlug, "Link inválido ou reservado."),
  address: z.string().trim().max(200).default(""),
  iAmBarber: z.boolean(),
})

/** Seg–sáb, 09:00–19:00 — ponto de partida editável no painel. */
const DEFAULT_WORKING_HOURS = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1140 }))

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("/onboarding")
  const { error } = await searchParams

  async function createTenant(formData: FormData) {
    "use server"
    const user = await requireUser("/onboarding")
    const parsed = onboardingSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      address: formData.get("address") ?? "",
      iAmBarber: formData.get("iAmBarber") === "on",
    })
    if (!parsed.success) {
      redirect(`/onboarding?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados inválidos.")}`)
    }
    const { name, slug, address, iAmBarber } = parsed.data
    try {
      await db.tenant.create({
        data: {
          name,
          slug,
          address,
          memberships: { create: { userId: user.id, role: "OWNER" } },
          barbers: iAmBarber
            ? { create: { name: user.name || name, userId: user.id, workingHours: { create: DEFAULT_WORKING_HOURS } } }
            : undefined,
        },
      })
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        redirect(`/onboarding?error=${encodeURIComponent("Esse link já está em uso.")}`)
      }
      throw err
    }
    redirect(`/admin/${slug}`)
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Cadastrar minha barbearia</h1>
      <p className="mt-1 text-sm text-muted">Em seguida você cadastra serviços, barbeiros e horários.</p>
      {error && <p className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
      <form action={createTenant} className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">Nome da barbearia</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="slug">Seu link</label>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]"
            placeholder="barbearia-do-ze"
            className="input"
          />
          <p className="mt-1 text-xs text-muted">Letras minúsculas, números e hífen. Vira o endereço que você divulga.</p>
        </div>
        <div>
          <label className="label" htmlFor="address">Endereço</label>
          <input id="address" name="address" className="input" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="iAmBarber" defaultChecked /> Eu também atendo como barbeiro
        </label>
        <SubmitButton className="btn-primary w-full" pendingText="Criando…">
          Criar barbearia
        </SubmitButton>
      </form>
    </div>
  )
}
