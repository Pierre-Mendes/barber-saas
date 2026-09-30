"use client"

import { useState, useTransition } from "react"
import { MailIcon } from "lucide-react"
import { toast } from "sonner"
import { signInWithEmailAction, signInWithGoogleAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function Heading({ asPage, title, children }: { asPage?: boolean; title: string; children: React.ReactNode }) {
  if (asPage) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    )
  }
  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{children}</DialogDescription>
    </DialogHeader>
  )
}

/**
 * Login: link mágico por e-mail e Google (se configurado).
 * `asPage` renderiza fora de um diálogo (página /login).
 */
export function SignInDialogContent({
  callbackUrl,
  googleEnabled,
  asPage,
}: {
  callbackUrl?: string
  googleEnabled: boolean
  asPage?: boolean
}) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()
  const target = callbackUrl ?? (typeof window !== "undefined" ? window.location.pathname : "/")

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <MailIcon className="size-6" />
        </div>
        <Heading asPage={asPage} title="Confira seu e-mail">
          Enviamos um link de acesso para <b className="text-foreground">{email}</b>. Ele vale por 24 horas.
        </Heading>
      </div>
    )
  }

  return (
    <>
      <Heading asPage={asPage} title="Faça login">
        Entre para agendar e acompanhar seus horários.
      </Heading>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          startTransition(async () => {
            const result = await signInWithEmailAction(email, target)
            if (result.ok) {
              setSent(true)
            } else {
              toast.error(result.error)
            }
          })
        }}
      >
        <Input
          id="email"
          type="email"
          required
          placeholder="seu@email.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          <MailIcon />
          {pending ? "Enviando…" : "Receber link de acesso"}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <form action={signInWithGoogleAction.bind(null, target)}>
            <Button type="submit" variant="outline" className="w-full font-bold">
              <GoogleLogo /> Google
            </Button>
          </form>
        </>
      )}
    </>
  )
}
