import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { signIn } from "@/auth"
import { SubmitButton } from "@/components/submit-button"

const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

/** Tela de login neutra (sem marca da plataforma), usada também nos links das barbearias. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const { callbackUrl = "/", error } = await searchParams

  async function emailLogin(formData: FormData) {
    "use server"
    try {
      await signIn("nodemailer", { email: String(formData.get("email") ?? ""), redirectTo: callbackUrl })
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=${err.type}&callbackUrl=${encodeURIComponent(callbackUrl)}`)
      }
      throw err
    }
  }

  async function googleLogin() {
    "use server"
    await signIn("google", { redirectTo: callbackUrl })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-1 text-sm text-muted">Enviaremos um link de acesso para o seu e-mail.</p>
      {error && <p className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">Não foi possível entrar. Tente novamente.</p>}
      <form action={emailLogin} className="mt-6 space-y-3">
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        <SubmitButton className="btn-primary w-full" pendingText="Enviando…">
          Receber link de acesso
        </SubmitButton>
      </form>
      {hasGoogle && (
        <form action={googleLogin} className="mt-3">
          <button className="btn-secondary w-full">Continuar com Google</button>
        </form>
      )}
    </main>
  )
}
