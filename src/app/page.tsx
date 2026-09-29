import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { PlatformHeader } from "@/components/platform-header"

export default async function HomePage() {
  const session = await auth()
  if (session?.user) {
    redirect("/explore")
  }

  return (
    <>
      <PlatformHeader />
      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-16 md:grid-cols-2">
        <section>
          <h1 className="text-4xl font-bold">Seu horário na barbearia, sem ligação.</h1>
          <p className="mt-4 text-muted">
            Agende em segundos, receba lembrete no e-mail e no celular e adicione direto na sua agenda.
          </p>
          <Link href="/login" className="btn-primary mt-6">
            Criar conta / Entrar
          </Link>
        </section>
        <section className="card">
          <h2 className="text-xl font-semibold">Tem uma barbearia?</h2>
          <p className="mt-2 text-sm text-muted">
            Ganhe um link próprio para divulgar, cadastre seus barbeiros, defina a agenda de cada um e controle quem
            acessa o quê.
          </p>
          <Link href="/onboarding" className="btn-secondary mt-4">
            Cadastrar minha barbearia
          </Link>
        </section>
      </main>
    </>
  )
}
