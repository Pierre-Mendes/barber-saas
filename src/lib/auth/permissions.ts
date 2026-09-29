import type { Role } from "@prisma/client"

/**
 * Matriz de permissões do painel da barbearia.
 * BARBER só enxerga e gerencia a própria agenda (checado por `barberId` nas ações).
 */
export const PERMISSIONS = {
  "settings.manage": ["OWNER"],
  "team.manage": ["OWNER", "MANAGER"],
  "barbers.manage": ["OWNER", "MANAGER"],
  "services.manage": ["OWNER", "MANAGER"],
  "bookings.viewAll": ["OWNER", "MANAGER", "RECEPTIONIST"],
  "bookings.manageAll": ["OWNER", "MANAGER", "RECEPTIONIST"],
  "schedule.manageAll": ["OWNER", "MANAGER"],
  "schedule.manageOwn": ["OWNER", "MANAGER", "BARBER"],
  "panel.access": ["OWNER", "MANAGER", "RECEPTIONIST", "BARBER"],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) {
    return false
  }
  return (PERMISSIONS[permission] as readonly Role[]).includes(role)
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Dono",
  MANAGER: "Gerente",
  RECEPTIONIST: "Recepção",
  BARBER: "Barbeiro",
}

/** Papéis que um membro pode atribuir a outros. Gerente não cria dono nem gerente. */
export function assignableRoles(role: Role): Role[] {
  if (role === "OWNER") {
    return ["OWNER", "MANAGER", "RECEPTIONIST", "BARBER"]
  }
  if (role === "MANAGER") {
    return ["RECEPTIONIST", "BARBER"]
  }
  return []
}

/** Um membro só pode alterar/remover quem tem papel que ele mesmo poderia atribuir. */
export function canManageMember(actorRole: Role, targetRole: Role): boolean {
  return assignableRoles(actorRole).includes(targetRole)
}
