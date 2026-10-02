import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/demo"
import { env } from "@/lib/env"

/** O que a tela de login oferece (serializável: vai para componentes cliente). */
export interface SignInOptions {
  googleEnabled: boolean
  demoAccounts: DemoAccount[]
}

export function signInOptions(): SignInOptions {
  return {
    googleEnabled: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    demoAccounts: env.demoLogins ? DEMO_ACCOUNTS : [],
  }
}
