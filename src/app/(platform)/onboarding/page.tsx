import { redirect } from "next/navigation"
import { z } from "zod"
import { StoreIcon } from "lucide-react"
import { SubmitButton } from "@/components/submit-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input } from "@/components/ui/input"
import { requireUser } from "@/lib/auth/guards"
import { isPrismaUniqueViolation } from "@/lib/booking/service"
import { invalidateTenant } from "@/lib/cache/keys"
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
      const tenant = await db.tenant.create({
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
      // Remove um eventual "não encontrado" guardado no cache para esse slug.
      await invalidateTenant(tenant)
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
      <Card>
        <CardHeader className="items-start">
          <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <StoreIcon className="size-5" />
          </div>
          <CardTitle className="text-2xl font-bold">Cadastrar minha barbearia</CardTitle>
          <CardDescription>Em seguida você cadastra serviços, barbeiros e horários.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 rounded-lg bg-destructive/15 p-3 text-sm text-red-300">{error}</p>}
          <form action={createTenant} className="grid gap-4">
            <Field label="Nome da barbearia" htmlFor="name">
              <Input id="name" name="name" required />
            </Field>
            <Field label="Seu link" htmlFor="slug" hint="Letras minúsculas, números e hífen. É o endereço que você vai divulgar.">
              <Input id="slug" name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" placeholder="barbearia-do-ze" />
            </Field>
            <Field label="Endereço" htmlFor="address">
              <Input id="address" name="address" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="iAmBarber" defaultChecked className="size-4 accent-[var(--brand)]" /> Eu também atendo como barbeiro
            </label>
            <SubmitButton size="lg" pendingText="Criando…">
              Criar barbearia
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
