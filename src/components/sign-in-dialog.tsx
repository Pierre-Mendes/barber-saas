"use client"

import { useState, useTransition } from "react"
import { KeyRoundIcon, LogInIcon, MailIcon, UserPlusIcon, ZapIcon } from "lucide-react"
import { toast } from "sonner"
import {
  demoSignInAction,
  signInWithEmailAction,
  signInWithGoogleAction,
  signInWithPasswordAction,
  signUpAction,
  type AuthResult,
} from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, Label } from "@/components/ui/input"
import type { SignInOptions } from "@/lib/auth/options"
import { cn } from "@/lib/utils"

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

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> {children} <span className="h-px flex-1 bg-border" />
    </div>
  )
}

type Mode = "signin" | "signup" | "link" | "sent"

const TITLES: Record<Exclude<Mode, "sent">, { title: string; text: string }> = {
  signin: { title: "Entrar", text: "Use seu e-mail e senha." },
  signup: { title: "Criar conta", text: "Leva 10 segundos. Depois é só agendar." },
  link: { title: "Entrar sem senha", text: "Enviamos um link de acesso para o seu e-mail." },
}

/**
 * Login: e-mail + senha (padrão), criar conta, link por e-mail (sem senha / esqueci a senha),
 * Google (se configurado) e, em desenvolvimento, atalhos para as contas de demonstração.
 * `asPage` renderiza fora de um diálogo (página /login).
 */
export function SignInDialogContent({
  callbackUrl,
  options,
  asPage,
}: {
  callbackUrl?: string
  options: SignInOptions
  asPage?: boolean
}) {
  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, startTransition] = useTransition()
  const target = callbackUrl ?? (typeof window !== "undefined" ? window.location.pathname : "/")

  /** Recarrega a página inteira para todos os componentes de servidor verem a sessão nova. */
  function finish(result: AuthResult) {
    if (result.ok) {
      window.location.assign(result.redirectTo)
    } else {
      toast.error(result.error)
    }
  }

  if (mode === "sent") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <MailIcon className="size-6" />
        </div>
        <Heading asPage={asPage} title="Confira seu e-mail">
          Enviamos um link de acesso para <b className="text-foreground">{email}</b>. Ele vale por 24 horas.
        </Heading>
        <Button variant="ghost" size="sm" onClick={() => setMode("signin")}>
          Voltar e entrar com senha
        </Button>
      </div>
    )
  }

  return (
    <>
      <Heading asPage={asPage} title={TITLES[mode].title}>
        {TITLES[mode].text}
      </Heading>

      {mode !== "link" && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1" role="tablist">
          {(["signin", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => setMode(tab)}
              className={cn(
                "cursor-pointer rounded-md py-1.5 text-sm font-semibold text-muted-foreground transition",
                mode === tab && "bg-background text-foreground shadow",
              )}
            >
              {tab === "signin" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>
      )}

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          startTransition(async () => {
            if (mode === "signin") {
              finish(await signInWithPasswordAction(email, password, target))
            } else if (mode === "signup") {
              finish(await signUpAction({ name, email, password }, target))
            } else {
              const result = await signInWithEmailAction(email, target)
              if (result.ok) {
                setMode("sent")
              } else {
                toast.error(result.error)
              }
            }
          })
        }}
      >
        {mode === "signup" && (
          <div>
            <Label htmlFor="signin-name">Nome</Label>
            <Input id="signin-name" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        )}
        <div>
          <Label htmlFor="signin-email">E-mail</Label>
          <Input
            id="signin-email"
            type="email"
            required
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {mode !== "link" && (
          <div>
            <Label htmlFor="signin-password">Senha</Label>
            <Input
              id="signin-password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "Mínimo de 8 caracteres" : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {mode === "signin" && <LogInIcon />}
          {mode === "signup" && <UserPlusIcon />}
          {mode === "link" && <MailIcon />}
          {pending ? "Aguarde…" : mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta e entrar" : "Receber link de acesso"}
        </Button>
      </form>

      <div className="flex justify-center">
        {mode === "link" ? (
          <Button variant="link" size="sm" onClick={() => setMode("signin")}>
            <KeyRoundIcon /> Entrar com senha
          </Button>
        ) : (
          <Button variant="link" size="sm" onClick={() => setMode("link")}>
            <MailIcon /> Esqueci a senha / entrar sem senha
          </Button>
        )}
      </div>

      {options.googleEnabled && (
        <>
          <Divider>ou</Divider>
          <form action={signInWithGoogleAction.bind(null, target)}>
            <Button type="submit" variant="outline" className="w-full font-bold">
              <GoogleLogo /> Google
            </Button>
          </form>
        </>
      )}

      {options.demoAccounts.length > 0 && (
        <>
          <Divider>
            <span className="flex items-center gap-1">
              <ZapIcon className="size-3" /> acesso rápido (demonstração)
            </span>
          </Divider>
          <div className="grid grid-cols-2 gap-2">
            {options.demoAccounts.map((account) => (
              <Button
                key={account.email}
                type="button"
                variant="secondary"
                className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left whitespace-normal"
                disabled={pending}
                onClick={() => startTransition(async () => finish(await demoSignInAction(account.email, target)))}
              >
                <span className="text-sm font-bold">{account.label}</span>
                <span className="text-[11px] leading-tight font-normal text-muted-foreground">{account.description}</span>
              </Button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
