"use server"

import { AuthError } from "next-auth"
import { z } from "zod"
import { signIn } from "@/auth"

/** Só aceita caminhos relativos, para não virar redirecionamento aberto. */
function safeCallback(callbackUrl: string): string {
  return callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/"
}

export async function signInWithEmailAction(email: string, callbackUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.email().safeParse(email.trim().toLowerCase())
  if (!parsed.success) {
    return { ok: false, error: "Informe um e-mail válido." }
  }
  try {
    await signIn("nodemailer", { email: parsed.data, redirectTo: safeCallback(callbackUrl), redirect: false })
    return { ok: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Não foi possível enviar o link. Tente novamente." }
    }
    throw error
  }
}

export async function signInWithGoogleAction(callbackUrl: string): Promise<void> {
  await signIn("google", { redirectTo: safeCallback(callbackUrl) })
}
