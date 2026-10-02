/**
 * Contas de demonstração criadas pelo seed (`prisma/seed.ts`). O login mostra atalhos para elas
 * quando `env.demoLogins` está ligado (sempre em dev). Sem imports com "@/": o seed também usa.
 */
export const DEMO_PASSWORD = "barber123"

export interface DemoAccount {
  email: string
  label: string
  description: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "dono@zebu.dev", label: "Dono", description: "Zebu Barber Club · painel completo" },
  { email: "recepcao@zebu.dev", label: "Recepção", description: "Zebu · agenda de todos" },
  { email: "ze@zebu.dev", label: "Barbeiro (Zé)", description: "Zebu · só a própria agenda" },
  { email: "cliente@exemplo.dev", label: "Cliente", description: "Vitrine, favoritas e reservas" },
]
