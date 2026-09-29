import Link from "next/link"
import { auth, signOut } from "@/auth"
import { db } from "@/lib/db"

export async function PlatformHeader() {
  const session = await auth()
  const hasPanel = session?.user?.id
    ? (await db.membership.count({ where: { userId: session.user.id } })) > 0
    : false

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="text-lg font-bold">
          ✂️ Agenda
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link href="/explore" className="hover:text-brand">
                Barbearias
              </Link>
              <Link href="/bookings" className="hover:text-brand">
                Meus agendamentos
              </Link>
              {hasPanel && (
                <Link href="/admin" className="hover:text-brand">
                  Painel
                </Link>
              )}
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <button className="text-muted hover:text-white">Sair</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
