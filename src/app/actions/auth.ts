"use server"

import { AuthError } from "next-auth"
import { z } from "zod"
import { headers } from "next/headers"
import { clientIp, signIn } from "@/auth"
import { landingPath, safeCallback } from "@/lib/auth/landing"
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password"
import { RATE_LIMITS, rateLimit } from "@/lib/cache/rate-limit"
import { db } from "@/lib/db"
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo"
import { env } from "@/lib/env"

export type AuthResult = { ok: true; redirectTo: string } | { ok: false; error: string }

const emailSchema = z.email("Informe um e-mail válido.")

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

/** Entra com e-mail e senha (provider `password`). Rate limit fica no próprio provider. */
async function passwordSignIn(email: string, password: string, callbackUrl: string): Promise<AuthResult> {
  try {
    await signIn("password", { email, password, redirect: false })
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "E-mail ou senha incorretos. Muitas tentativas bloqueiam por alguns minutos." }
    }
    throw error
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true } })
  return { ok: true, redirectTo: await landingPath(user, callbackUrl) }
}

export async function signInWithPasswordAction(email: string, password: string, callbackUrl: string): Promise<AuthResult> {
  const parsed = emailSchema.safeParse(normalizeEmail(email))
  if (!parsed.success || !password) {
    return { ok: false, error: "Informe e-mail e senha." }
  }
  return passwordSignIn(parsed.data, password, callbackUrl)
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: emailSchema,
  password: z.string().min(MIN_PASSWORD_LENGTH, `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`).max(200),
})

/** Cria conta com senha e já entra. E-mail fica "não confirmado" até o primeiro login por link ou Google. */
export async function signUpAction(input: z.input<typeof signUpSchema>, callbackUrl: string): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse({ ...input, email: normalizeEmail(input.email ?? "") })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }
  if (!(await rateLimit("signup:ip", clientIp(await headers()), RATE_LIMITS.signUpIp)).ok) {
    return { ok: false, error: "Muitas contas criadas daqui. Tente mais tarde." }
  }
  const { name, email, password } = parsed.data
  const existing = await db.user.findUnique({ where: { email }, select: { passwordHash: true } })
  if (existing) {
    return {
      ok: false,
      error: existing.passwordHash
        ? "Esse e-mail já tem conta. Use “Entrar”."
        : "Esse e-mail já tem conta. Entre com o link por e-mail e defina uma senha em Minha conta.",
    }
  }
  await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } })
  return passwordSignIn(email, password, callbackUrl)
}

/** Atalho das contas de demonstração (só com `env.demoLogins`). */
export async function demoSignInAction(email: string, callbackUrl: string): Promise<AuthResult> {
  if (!env.demoLogins || !DEMO_ACCOUNTS.some((account) => account.email === email)) {
    return { ok: false, error: "Acesso de demonstração desativado." }
  }
  return passwordSignIn(email, DEMO_PASSWORD, callbackUrl)
}

/** Link de acesso por e-mail (alternativa a senha; também serve para quem esqueceu a senha). */
export async function signInWithEmailAction(email: string, callbackUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = emailSchema.safeParse(normalizeEmail(email))
  if (!parsed.success) {
    return { ok: false, error: "Informe um e-mail válido." }
  }
  const [byEmail, byIp] = await Promise.all([
    rateLimit("signin:email", parsed.data, RATE_LIMITS.signInEmail),
    rateLimit("signin:ip", clientIp(await headers()), RATE_LIMITS.signInIp),
  ])
  if (!byEmail.ok || !byIp.ok) {
    return { ok: false, error: "Muitos pedidos de acesso. Tente de novo em alguns minutos." }
  }
  try {
    const redirectTo = await landingPath({ email: parsed.data }, callbackUrl)
    await signIn("nodemailer", { email: parsed.data, redirectTo, redirect: false })
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
