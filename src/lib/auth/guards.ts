import "server-only"
import { notFound, redirect } from "next/navigation"
import type { Barber, Membership, Tenant } from "@prisma/client"
import { currentUser } from "@/auth"
import { db } from "@/lib/db"
import { can, type Permission } from "./permissions"

export async function requireUser(callbackUrl = "/") {
  const user = await currentUser()
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }
  return user
}

export interface PanelContext {
  user: { id: string; name?: string | null; email?: string | null }
  tenant: Tenant
  membership: Membership
  /** Perfil de barbeiro do usuário nessa barbearia, se houver. */
  ownBarber: Barber | null
}

/**
 * Garante que o usuário é membro da barbearia `slug` com a permissão pedida.
 * Todo acesso a dados do painel passa por aqui — é a fronteira de isolamento entre tenants.
 */
export async function requirePanel(slug: string, permission: Permission = "panel.access"): Promise<PanelContext> {
  const user = await requireUser(`/admin/${slug}`)
  const membership = await db.membership.findFirst({
    where: { userId: user.id, tenant: { slug } },
    include: { tenant: true },
  })
  if (!membership) {
    notFound()
  }
  if (!can(membership.role, permission)) {
    redirect(`/admin/${slug}?acesso=negado`)
  }
  const ownBarber = await db.barber.findFirst({
    where: { tenantId: membership.tenantId, userId: user.id },
  })
  const { tenant, ...rest } = membership
  return { user, tenant, membership: rest, ownBarber }
}

/** BARBER só mexe na própria agenda; demais papéis com `schedule.manageAll` mexem em todas. */
export function canManageBarberSchedule(ctx: PanelContext, barberId: string): boolean {
  if (can(ctx.membership.role, "schedule.manageAll")) {
    return true
  }
  return can(ctx.membership.role, "schedule.manageOwn") && ctx.ownBarber?.id === barberId
}
