import "server-only"
import { db } from "@/lib/db"

/** Só aceita caminhos relativos, para não virar redirecionamento aberto. */
export function safeCallback(callbackUrl: string | null | undefined): string {
  return callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/"
}

/**
 * Para onde ir depois do login. Se a pessoa veio de uma página específica, volta para ela;
 * se entrou pela home, quem é da equipe de alguma barbearia cai no painel (/admin escolhe qual).
 */
export async function landingPath(user: { id?: string; email?: string } | null, callbackUrl: string): Promise<string> {
  const target = safeCallback(callbackUrl)
  if (target !== "/" || !user) {
    return target
  }
  const where = user.id ? { userId: user.id } : { user: { email: user.email } }
  const isStaff = (await db.membership.count({ where: { ...where, tenant: { active: true } } })) > 0
  return isStaff ? "/admin" : "/"
}
