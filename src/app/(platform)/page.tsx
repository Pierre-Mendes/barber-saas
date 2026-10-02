import Link from "next/link"
import { BellRingIcon, CalendarPlusIcon, LayoutDashboardIcon, ShieldCheckIcon, StoreIcon, UsersIcon } from "lucide-react"
import { auth } from "@/auth"
import { BarbershopItem } from "@/components/barbershop-item"
import { BookingItem } from "@/components/booking-item"
import { DemoAccess } from "@/components/demo-access"
import { HomeBanner } from "@/components/home-banner"
import { HorizontalList } from "@/components/horizontal-list"
import { QuickSearch } from "@/components/quick-search"
import { SearchBar } from "@/components/search-bar"
import { SignInButton } from "@/components/sign-in-button"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { signInOptions } from "@/lib/auth/options"
import { ROLE_LABELS } from "@/lib/auth/permissions"
import { bookingCardInclude, toBookingCard } from "@/lib/booking/view"
import { PLATFORM_NAME } from "@/lib/catalog"
import { db } from "@/lib/db"
import { getMarketplaceShops } from "@/lib/marketplace/queries"

function Greeting({ name }: { name?: string | null }) {
  const today = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())
  return (
    <div>
      <h2 className="text-xl font-bold">Olá, {name?.split(" ")[0] ?? "bem-vindo"}!</h2>
      <p className="text-sm text-muted-foreground first-letter:uppercase">{today}</p>
    </div>
  )
}

export default async function HomePage() {
  const session = await auth()
  const user = session?.user
  if (!user?.id) {
    return <Landing />
  }

  const [shops, upcoming, memberships] = await Promise.all([
    getMarketplaceShops(user.id),
    db.booking.findMany({
      where: { customer: { userId: user.id }, status: "CONFIRMED", endsAt: { gte: new Date() } },
      include: bookingCardInclude,
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
    db.membership.findMany({
      where: { userId: user.id, tenant: { active: true } },
      include: { tenant: true },
      orderBy: { tenant: { name: "asc" } },
    }),
  ])
  const favorites = shops.filter((shop) => shop.isFavorite)
  const popular = [...shops].sort((a, b) => b.completedCount - a.completedCount)
  const frequent = shops
    .filter((shop) => shop.myCompletedCount > 0)
    .sort((a, b) => b.myCompletedCount - a.myCompletedCount)

  return (
    <div>
      <Greeting name={user.name} />
      {memberships.length > 0 && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {memberships.map((m) => (
            <Link key={m.id} href={`/admin/${m.tenant.slug}`}>
              <Card className="flex items-center gap-4 border-primary/40 p-4 transition hover:border-primary">
                <UserAvatar name={m.tenant.name} image={m.tenant.logoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Você trabalha aqui · {ROLE_LABELS[m.role]}</p>
                  <p className="truncate font-semibold">{m.tenant.name}</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <LayoutDashboardIcon className="size-4" /> Abrir painel
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-6">
        <SearchBar />
      </div>
      <div className="mt-6">
        <QuickSearch />
      </div>
      <div className="mt-6">
        <HomeBanner />
      </div>

      {upcoming.length > 0 && (
        <HorizontalList title="Agendamentos" className="gap-3">
          {upcoming.map((booking) => (
            <BookingItem key={booking.id} booking={toBookingCard(booking)} className="md:max-w-md md:min-w-[380px]" />
          ))}
        </HorizontalList>
      )}

      {favorites.length > 0 && (
        <HorizontalList title="Suas favoritas">
          {favorites.map((shop) => (
            <BarbershopItem key={shop.id} shop={shop} className="w-[167px] shrink-0 md:w-[220px]" />
          ))}
        </HorizontalList>
      )}

      <HorizontalList title="Recomendados">
        {shops.map((shop) => (
          <BarbershopItem key={shop.id} shop={shop} className="w-[167px] shrink-0 md:w-[220px]" />
        ))}
      </HorizontalList>

      <HorizontalList title="Populares">
        {popular.map((shop) => (
          <BarbershopItem key={shop.id} shop={shop} className="w-[167px] shrink-0 md:w-[220px]" />
        ))}
      </HorizontalList>

      {frequent.length > 0 && (
        <HorizontalList title="Onde você mais vai">
          {frequent.map((shop) => (
            <BarbershopItem key={shop.id} shop={shop} className="w-[167px] shrink-0 md:w-[220px]" />
          ))}
        </HorizontalList>
      )}
    </div>
  )
}

const FEATURES = [
  { icon: CalendarPlusIcon, title: "Agende em segundos", text: "Escolha o serviço, o barbeiro e o horário livre." },
  { icon: BellRingIcon, title: "Lembretes", text: "E-mail e notificação no celular antes do horário." },
  { icon: ShieldCheckIcon, title: "Na sua agenda", text: "Salve no Google Agenda, Outlook ou Apple Calendar." },
]

function Landing() {
  const { demoAccounts } = signInOptions()
  return (
    <div className="space-y-10">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl leading-tight font-extrabold md:text-5xl">
            Seu horário na barbearia, <span className="text-primary">sem ligação</span>.
          </h1>
          <p className="text-muted-foreground">
            Encontre barbearias, salve suas favoritas e agende com o profissional que você prefere.
          </p>
          <div className="flex flex-wrap gap-3">
            <SignInButton signInOptions={signInOptions()} size="lg" callbackUrl="/">
              Entrar ou criar conta
            </SignInButton>
            <Button size="lg" variant="outline" asChild>
              <Link href="/onboarding">
                <StoreIcon /> Tenho uma barbearia
              </Link>
            </Button>
          </div>
        </div>
        <HomeBanner title={`Agende nos melhores com ${PLATFORM_NAME}`} />
      </section>

      {demoAccounts.length > 0 && <DemoAccess accounts={demoAccounts} />}

      <section className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardContent className="flex gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <feature.icon className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">Para barbearias</h3>
              <p className="text-sm text-muted-foreground">
                Link próprio para divulgar, agenda por barbeiro, equipe com níveis de acesso e lembretes automáticos.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/onboarding">Cadastrar minha barbearia</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
