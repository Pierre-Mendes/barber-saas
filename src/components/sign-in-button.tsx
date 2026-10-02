"use client"

import { LogInIcon } from "lucide-react"
import { SignInDialogContent } from "@/components/sign-in-dialog"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import type { SignInOptions } from "@/lib/auth/options"

/** Botão que abre o diálogo de login (e-mail / Google). */
export function SignInButton({
  children = "Entrar",
  signInOptions,
  callbackUrl,
  ...props
}: ButtonProps & { signInOptions: SignInOptions; callbackUrl?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button {...props}>
          <LogInIcon />
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <SignInDialogContent options={signInOptions} callbackUrl={callbackUrl} />
      </DialogContent>
    </Dialog>
  )
}
