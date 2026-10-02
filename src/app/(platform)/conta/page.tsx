import Link from "next/link"
import { ChevronRightIcon, KeyRoundIcon, UserIcon } from "lucide-react"
import { ImageField } from "@/components/admin/image-field"
import { Flash, type FlashParams } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input } from "@/components/ui/input"
import { updatePasswordAction, updateProfileAction } from "@/app/actions/account"
import { requireUser } from "@/lib/auth/guards"
import { ROLE_LABELS } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { isStorageConfigured } from "@/lib/storage"

export const metadata = { title: "Minha conta" }

export default async function AccountPage({ searchParams }: { searchParams: FlashParams }) {
  const sessionUser = await requireUser("/conta")
  const user = await db.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    include: { memberships: { include: { tenant: true }, orderBy: { tenant: { name: "asc" } } } },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Flash {...await searchParams} />
      <div className="flex items-center gap-4">
        <UserAvatar name={user.name ?? user.email} image={user.image} className="size-14" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{user.name ?? "Minha conta"}</h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {user.memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Barbearias em que você trabalha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.memberships.map((m) => (
              <Link
                key={m.id}
                href={`/admin/${m.tenant.slug}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition hover:border-primary/60"
              >
                <UserAvatar name={m.tenant.name} image={m.tenant.logoUrl} className="size-9" />
                <span className="flex-1 font-semibold">{m.tenant.name}</span>
                <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-4" /> Perfil
          </CardTitle>
          <CardDescription>Seu nome aparece para as barbearias quando você agenda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="grid gap-4 sm:grid-cols-2">
            <ImageField
              label="Foto"
              fileName="imageFile"
              urlName="image"
              currentUrl={user.image}
              uploadEnabled={isStorageConfigured()}
              aspect="round"
              hint="JPG, PNG, WebP ou AVIF, até 5 MB."
            />
            <div className="grid gap-4">
              <Field label="Nome" htmlFor="name">
                <Input id="name" name="name" defaultValue={user.name ?? ""} required autoComplete="name" />
              </Field>
              <Field label="Celular" htmlFor="phone">
                <Input id="phone" name="phone" defaultValue={user.phone ?? ""} inputMode="tel" autoComplete="tel" />
              </Field>
            </div>
            <SubmitButton className="sm:col-span-2 sm:justify-self-start">Salvar perfil</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4" /> Senha
          </CardTitle>
          <CardDescription>
            {user.passwordHash
              ? "Troque a senha usada para entrar com e-mail."
              : "Você entra pelo link do e-mail. Defina uma senha para entrar direto, sem esperar o e-mail."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updatePasswordAction} className="grid gap-4 sm:grid-cols-2">
            {user.passwordHash && (
              <Field label="Senha atual" htmlFor="currentPassword">
                <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
              </Field>
            )}
            <Field label="Nova senha" htmlFor="newPassword" hint="Mínimo de 8 caracteres.">
              <Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            </Field>
            <SubmitButton className="sm:col-span-2 sm:justify-self-start">{user.passwordHash ? "Trocar senha" : "Definir senha"}</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
