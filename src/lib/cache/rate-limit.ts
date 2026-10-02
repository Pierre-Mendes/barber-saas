import { key } from "./index"
import { getStore } from "./store"

export interface RateLimitRule {
  limit: number
  windowSeconds: number
}

/** Limites usados pela aplicação. */
export const RATE_LIMITS = {
  /** Link mágico por e-mail (anti-spam da caixa de entrada). */
  signInEmail: { limit: 5, windowSeconds: 15 * 60 },
  /** Link mágico por IP. */
  signInIp: { limit: 20, windowSeconds: 15 * 60 },
  /** Backstop no próprio provider de e-mail (cobre chamadas diretas à API do Auth.js). */
  signInProvider: { limit: 10, windowSeconds: 15 * 60 },
  /** Tentativas de login com senha por e-mail (força bruta). */
  signInPassword: { limit: 10, windowSeconds: 15 * 60 },
  /** Tentativas de login com senha por IP. */
  signInPasswordIp: { limit: 40, windowSeconds: 15 * 60 },
  /** Contas criadas por IP. */
  signUpIp: { limit: 5, windowSeconds: 60 * 60 },
  /** Reservas sem conta por IP (além do limite por e-mail em `booking`). */
  guestBookingIp: { limit: 10, windowSeconds: 60 * 60 },
  /** Reservas por usuário (ou e-mail, para quem agenda sem conta). */
  booking: { limit: 10, windowSeconds: 10 * 60 },
} satisfies Record<string, RateLimitRule>

export interface RateLimitResult {
  ok: boolean
  remaining: number
}

/**
 * Janela fixa com INCR + EXPIRE. Fail-open: se o store falhar, permite
 * (indisponibilidade do Redis não pode derrubar login nem reservas).
 */
export async function rateLimit(name: string, identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
  try {
    const count = await getStore().incr(key("rl", name, identifier.toLowerCase()), rule.windowSeconds)
    return { ok: count <= rule.limit, remaining: Math.max(0, rule.limit - count) }
  } catch (error) {
    console.error("[rate-limit] indisponível:", error instanceof Error ? error.message : error)
    return { ok: true, remaining: rule.limit }
  }
}
