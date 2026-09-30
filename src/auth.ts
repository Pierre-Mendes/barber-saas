import NextAuth, { type NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Nodemailer from "next-auth/providers/nodemailer"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { RATE_LIMITS, rateLimit } from "@/lib/cache/rate-limit"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { sessionCookieDomain } from "@/lib/tenancy/host"

const defaultEmailProvider = Nodemailer({ server: env.smtpUrl, from: env.emailFrom })

const providers: NextAuthConfig["providers"] = [
  Nodemailer({
    server: env.smtpUrl,
    from: env.emailFrom,
    // Backstop do rate limit: vale também para chamadas diretas à API do Auth.js.
    async sendVerificationRequest(params) {
      const { ok } = await rateLimit("signin:provider", params.identifier, RATE_LIMITS.signInProvider)
      if (!ok) {
        throw new Error("Limite de links de acesso atingido para este e-mail.")
      }
      return defaultEmailProvider.sendVerificationRequest(params)
    },
  }),
]

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google)
}

const cookieDomain = sessionCookieDomain(env.rootDomain)
const useSecureCookies = env.appUrl.startsWith("https://")

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verificar",
  },
  // Compartilha a sessão entre a plataforma e os subdomínios das barbearias.
  cookies: cookieDomain
    ? {
        sessionToken: {
          name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
          options: {
            domain: cookieDomain,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: useSecureCookies,
          },
        },
      }
    : undefined,
  callbacks: {
    // Permite voltar para a página da barbearia (subdomínio) depois do login.
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      try {
        const target = new URL(url)
        if (target.origin === baseUrl || (cookieDomain && target.hostname.endsWith(cookieDomain))) {
          return url
        }
      } catch {
        // URL inválida: cai no padrão abaixo.
      }
      return baseUrl
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id
      }
      return token
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})

/** Retorna o usuário logado ou `null`. */
export async function currentUser(): Promise<{ id: string; name?: string | null; email?: string | null } | null> {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }
  return { id: session.user.id, name: session.user.name, email: session.user.email }
}
