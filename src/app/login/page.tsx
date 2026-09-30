import { SignInDialogContent } from "@/components/sign-in-dialog"
import { Card, CardContent } from "@/components/ui/card"

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

/** Tela de login neutra (sem marca da plataforma): também é usada a partir dos links das barbearias. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams
  const safeCallback = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/"

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--brand)_-60%,transparent_60%)] px-5">
      <Card className="w-full max-w-sm">
        <CardContent className="grid gap-4 p-6">
          {error && (
            <p className="rounded-lg bg-destructive/15 p-3 text-center text-sm text-red-300">
              O link expirou ou já foi usado. Peça um novo.
            </p>
          )}
          <SignInDialogContent asPage googleEnabled={googleEnabled} callbackUrl={safeCallback} />
        </CardContent>
      </Card>
    </main>
  )
}
