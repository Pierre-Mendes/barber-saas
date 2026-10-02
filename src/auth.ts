import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Nodemailer from "next-auth/providers/nodemailer"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { z } from "zod"
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/auth/password"
import { linkGuestCustomers } from "@/lib/booking/service"
import { RATE_LIMITS, rateLimit } from "@/lib/cache/rate-limit"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { sessionCookieDomain } from "@/lib/tenancy/host"

const defaultEmailProvider = Nodemailer({ server: env.smtpUrl, from: env.emailFrom })

const passwordCredentials = z.object({ email: z.email(), password: z.string().min(1).max(200) })

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
}

const providers: NextAuthConfig["providers"] = [
  // E-mail + senha. O hash é conferido mesmo quando o e-mail não existe (tempo constante).
  Credentials({
    id: "password",
    name: "Senha",
    credentials: { email: {}, password: {} },
    async authorize(raw, request) {
      const parsed = passwordCredentials.safeParse({
        email: String(raw?.email ?? "").trim().toLowerCase(),
        password: raw?.password,
      })
      if (!parsed.success) {
        return null
      }
      const { email, password } = parsed.data
      const [byEmail, byIp] = await Promise.all([
        rateLimit("signin:password", email, RATE_LIMITS.signInPassword),
        rateLimit("signin:password-ip", clientIp(request.headers), RATE_LIMITS.signInPasswordIp),
      ])
      if (!byEmail.ok || !byIp.ok) {
        return null
      }
      const user = await db.user.findUnique({ where: { email } })
      const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
      if (!user || !valid) {
        return null
      }
      return { id: user.id, name: user.name, email: user.email, image: user.image }
    },
  }),
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

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({
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
  events: {
    // Reservas feitas sem conta com o mesmo e-mail passam a aparecer na conta — só com e-mail confirmado.
    async signIn({ user, account }) {
      if (!user.id || !user.email) {
        return
      }
      // Link por e-mail e Google provam o e-mail; senha só vale se o e-mail já foi confirmado antes.
      const verified =
        account?.provider !== "password" ||
        Boolean((await db.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } }))?.emailVerified)
      if (verified) {
        await linkGuestCustomers(user.id, user.email)
      }
    },
  },
  callbacks: {
    /**
     * Conta criada com senha ainda não tem e-mail confirmado. Se o dono real do e-mail entra
     * por link ou Google, a senha (que pode ter sido definida por outra pessoa) é descartada.
     */
    async signIn({ user, account, email }) {
      if (account?.provider !== "password" && !email?.verificationRequest && user.id) {
        await db.user.updateMany({
          where: { id: user.id, emailVerified: null, passwordHash: { not: null } },
          data: { passwordHash: null },
        })
      }
      return true
    },
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
    jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.sub = user.id
      }
      // `updateSession` em /conta: nome e foto novos sem precisar sair e entrar.
      if (trigger === "update" && session?.user) {
        token.name = session.user.name ?? token.name
        token.picture = session.user.image ?? token.picture
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
