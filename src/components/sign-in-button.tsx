"use client"

import { LogInIcon } from "lucide-react"
import { SignInDialogContent } from "@/components/sign-in-dialog"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

/** Botão que abre o diálogo de login (e-mail / Google). */
export function SignInButton({
  children = "Entrar",
  googleEnabled,
  callbackUrl,
  ...props
}: ButtonProps & { googleEnabled: boolean; callbackUrl?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button {...props}>
          <LogInIcon />
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <SignInDialogContent googleEnabled={googleEnabled} callbackUrl={callbackUrl} />
      </DialogContent>
    </Dialog>
  )
}
