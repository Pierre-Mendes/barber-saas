/**
 * Dados de demonstração: duas barbearias independentes, cada uma com
 * equipe, serviços, barbeiros e horários. Logins (link mágico via Mailpit):
 *   dono@navalha.dev       → dono da "Navalha de Ouro"
 *   recepcao@navalha.dev   → recepção da "Navalha de Ouro"
 *   ze@navalha.dev         → barbeiro (só vê a própria agenda)
 *   dono@vintage.dev       → dono da "Vintage Barber"
 *   cliente@exemplo.dev    → cliente com histórico nas duas
 */
import { PrismaClient, type Role } from "@prisma/client"

const db = new PrismaClient()

const WEEK = [1, 2, 3, 4, 5, 6]

async function user(email: string, name: string) {
  return db.user.upsert({ where: { email }, create: { email, name, emailVerified: new Date() }, update: {} })
}

async function tenant(input: {
  slug: string
  name: string
  address: string
  color: string
  staff: { email: string; name: string; role: Role; isBarber?: boolean }[]
  extraBarbers: string[]
  services: { name: string; price: number; durationMinutes: number; description: string }[]
}) {
  const existing = await db.tenant.findUnique({ where: { slug: input.slug } })
  if (existing) {
    return existing
  }
  const created = await db.tenant.create({
    data: {
      slug: input.slug,
      name: input.name,
      address: input.address,
      primaryColor: input.color,
      description: `Bem-vindo à ${input.name}. Agende online em segundos.`,
      phones: ["(11) 99999-0000"],
    },
  })
  const services = await Promise.all(
    input.services.map((service) => db.service.create({ data: { ...service, tenantId: created.id } })),
  )
  const barberNames: { name: string; userId?: string }[] = input.extraBarbers.map((name) => ({ name }))
  for (const member of input.staff) {
    const u = await user(member.email, member.name)
    await db.membership.create({ data: { tenantId: created.id, userId: u.id, role: member.role } })
    if (member.isBarber) {
      barberNames.push({ name: member.name, userId: u.id })
    }
  }
  for (const barber of barberNames) {
    await db.barber.create({
      data: {
        tenantId: created.id,
        name: barber.name,
        userId: barber.userId,
        services: { create: services.map((s) => ({ serviceId: s.id })) },
        workingHours: {
          create: WEEK.flatMap((weekday) => [
            { weekday, startMinute: 9 * 60, endMinute: 12 * 60 },
            { weekday, startMinute: 13 * 60, endMinute: 19 * 60 },
          ]),
        },
      },
    })
  }
  return created
}

async function history(tenantId: string, userId: string, count: number) {
  const barber = await db.barber.findFirstOrThrow({ where: { tenantId } })
  const service = await db.service.findFirstOrThrow({ where: { tenantId } })
  const customer = await db.customer.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId, name: "Cliente Exemplo" },
    update: {},
  })
  for (let i = 1; i <= count; i++) {
    const startsAt = new Date(Date.now() - i * 7 * 86_400_000)
    startsAt.setUTCHours(13, 0, 0, 0)
    await db.booking.create({
      data: {
        tenantId,
        customerId: customer.id,
        barberId: barber.id,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMinutes * 60_000),
        price: service.price,
        status: "COMPLETED",
      },
    })
  }
}

async function main() {
  const services = [
    { name: "Corte", price: 45, durationMinutes: 30, description: "Corte na tesoura ou máquina" },
    { name: "Barba", price: 35, durationMinutes: 30, description: "Toalha quente e navalha" },
    { name: "Corte + Barba", price: 70, durationMinutes: 60, description: "Combo completo" },
    { name: "Sobrancelha", price: 20, durationMinutes: 15, description: "Acabamento na navalha" },
  ]

  const navalha = await tenant({
    slug: "navalha",
    name: "Navalha de Ouro",
    address: "Av. Paulista, 1000 - São Paulo",
    color: "#c9a227",
    staff: [
      { email: "dono@navalha.dev", name: "Carlos (dono)", role: "OWNER", isBarber: true },
      { email: "recepcao@navalha.dev", name: "Júlia", role: "RECEPTIONIST" },
      { email: "ze@navalha.dev", name: "Zé", role: "BARBER", isBarber: true },
    ],
    extraBarbers: [],
    services,
  })

  const vintage = await tenant({
    slug: "vintage",
    name: "Vintage Barber",
    address: "Rua Augusta, 500 - São Paulo",
    color: "#e11d48",
    staff: [{ email: "dono@vintage.dev", name: "Rafa", role: "OWNER", isBarber: true }],
    extraBarbers: ["Léo"],
    services: services.slice(0, 3),
  })

  const client = await user("cliente@exemplo.dev", "Cliente Exemplo")
  if ((await db.booking.count({ where: { customer: { userId: client.id } } })) === 0) {
    await history(navalha.id, client.id, 2)
    await history(vintage.id, client.id, 5)
  }

  console.log("Seed concluído: /t/navalha e /t/vintage")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
