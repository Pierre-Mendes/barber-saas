/** Leitura centralizada de variáveis de ambiente com defaults de desenvolvimento. */
export const env = {
  get appUrl(): string {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  },
  get rootDomain(): string {
    return (process.env.ROOT_DOMAIN ?? "localhost:3000").toLowerCase()
  },
  get emailFrom(): string {
    return process.env.EMAIL_FROM ?? "Agenda <nao-responda@localhost>"
  },
  get smtpUrl(): string {
    return process.env.SMTP_URL ?? "smtp://localhost:1025"
  },
  get vapidPublicKey(): string | undefined {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined
  },
  get vapidPrivateKey(): string | undefined {
    return process.env.VAPID_PRIVATE_KEY || undefined
  },
  get vapidSubject(): string {
    return process.env.VAPID_SUBJECT ?? "mailto:suporte@exemplo.com"
  },
  get cronSecret(): string | undefined {
    return process.env.CRON_SECRET || undefined
  },
  /** Botões de acesso rápido às contas de demonstração no login. Ligado em dev; em produção só com DEMO_LOGINS=true. */
  get demoLogins(): boolean {
    return process.env.DEMO_LOGINS === "true" || (process.env.NODE_ENV !== "production" && process.env.DEMO_LOGINS !== "false")
  },
}
