/**
 * Dados de demonstração: várias barbearias independentes, cada uma com
 * equipe, serviços, barbeiros, horários e histórico. Logins (link mágico via Mailpit):
 *   dono@zebu.dev          → dono do "Zebu Barber Club"
 *   recepcao@zebu.dev      → recepção do "Zebu Barber Club"
 *   ze@zebu.dev            → barbeiro (só vê a própria agenda)
 *   dono@vintage.dev       → dono da "Vintage Barber"
 *   cliente@exemplo.dev    → cliente com histórico e uma favorita
 */
import { PrismaClient, type Role } from "@prisma/client"

const db = new PrismaClient()

const WEEK = [1, 2, 3, 4, 5, 6]

const SERVICES = {
  corte: { name: "Corte de cabelo", price: 50, durationMinutes: 30, description: "Tesoura ou máquina, com lavagem e finalização." },
  barba: { name: "Barba", price: 40, durationMinutes: 30, description: "Toalha quente, navalha e balm hidratante." },
  combo: { name: "Corte + Barba", price: 80, durationMinutes: 60, description: "O combo completo para sair renovado." },
  acabamento: { name: "Acabamento (pezinho)", price: 20, durationMinutes: 15, description: "Contorno e nuca alinhados na navalha." },
  sobrancelha: { name: "Sobrancelha", price: 20, durationMinutes: 15, description: "Design e limpeza na navalha ou pinça." },
  hidratacao: { name: "Hidratação capilar", price: 35, durationMinutes: 30, description: "Tratamento para fios macios e brilhantes." },
  massagem: { name: "Massagem relaxante", price: 60, durationMinutes: 45, description: "Massagem nos ombros, pescoço e couro cabeludo." },
} as const

type ServiceKey = keyof typeof SERVICES

interface TenantSeed {
  slug: string
  name: string
  address: string
  color: string
  cover: number
  description: string
  staff: { email: string; name: string; role: Role; isBarber?: boolean }[]
  extraBarbers: string[]
  services: ServiceKey[]
  completed: number
}

const TENANTS: TenantSeed[] = [
  {
    slug: "zebu",
    name: "Zebu Barber Club",
    address: "Av. Leopoldino de Oliveira, 3100 - Centro, Uberaba - MG",
    color: "#d4a82f",
    cover: 3,
    description:
      "Barbearia raiz no coração de Uberaba. Café mineiro, pão de queijo e profissionais que entendem de estilo.",
    staff: [
      { email: "dono@zebu.dev", name: "Carlos Mendes", role: "OWNER", isBarber: true },
      { email: "recepcao@zebu.dev", name: "Júlia Souza", role: "RECEPTIONIST" },
      { email: "ze@zebu.dev", name: "Zé Ricardo", role: "BARBER", isBarber: true },
    ],
    extraBarbers: ["Bruno Lima"],
    services: ["corte", "barba", "combo", "acabamento", "sobrancelha", "hidratacao"],
    completed: 42,
  },
  {
    slug: "vintage",
    name: "Vintage Barber",
    address: "Rua Artur Machado, 450 - Centro, Uberaba - MG",
    color: "#e11d48",
    cover: 6,
    description: "Rock, cadeiras antigas e cortes clássicos. Especialistas em pompadour e barbas longas.",
    staff: [{ email: "dono@vintage.dev", name: "Rafa Oliveira", role: "OWNER", isBarber: true }],
    extraBarbers: ["Léo Martins"],
    services: ["corte", "barba", "combo", "massagem"],
    completed: 67,
  },
  {
    slug: "corte-estilo",
    name: "Corte & Estilo",
    address: "Av. Santos Dumont, 1200 - Santa Maria, Uberaba - MG",
    color: "#8b5cf6",
    cover: 1,
    description: "Visagismo e cortes na tendência. Ambiente climatizado e atendimento com hora marcada.",
    staff: [{ email: "dono@corteestilo.dev", name: "Marina Alves", role: "OWNER" }],
    extraBarbers: ["Diego Costa", "Thiago Rocha"],
    services: ["corte", "barba", "combo", "sobrancelha", "hidratacao"],
    completed: 28,
  },
  {
    slug: "barba-negra",
    name: "Barba Negra",
    address: "Av. Guilherme Ferreira, 880 - São Benedito, Uberaba - MG",
    color: "#16a34a",
    cover: 4,
    description: "Especialistas em barba: modelagem, pigmentação e tratamentos com óleos naturais.",
    staff: [{ email: "dono@barbanegra.dev", name: "Paulo Henrique", role: "OWNER", isBarber: true }],
    extraBarbers: [],
    services: ["barba", "combo", "acabamento", "massagem"],
    completed: 15,
  },
  {
    slug: "dapper-den",
    name: "The Dapper Den",
    address: "Av. Fidélis Reis, 1500 - Fabrício, Uberaba - MG",
    color: "#0ea5e9",
    cover: 5,
    description: "Barbearia premium com sinuca, whisky e atendimento sem pressa.",
    staff: [{ email: "dono@dapper.dev", name: "André Nogueira", role: "OWNER", isBarber: true }],
    extraBarbers: ["Felipe Santos"],
    services: ["corte", "barba", "combo", "hidratacao", "massagem"],
    completed: 53,
  },
  {
    slug: "machado-tesoura",
    name: "Machado & Tesoura",
    address: "Rua Segismundo Mendes, 210 - Mercês, Uberaba - MG",
    color: "#f97316",
    cover: 7,
    description: "Estilo lenhador: barbas cheias, cortes com textura e atendimento raiz.",
    staff: [{ email: "dono@machado.dev", name: "Gustavo Pereira", role: "OWNER", isBarber: true }],
    extraBarbers: [],
    services: ["corte", "barba", "combo", "acabamento"],
    completed: 9,
  },
  {
    slug: "estilo-urbano",
    name: "Estilo Urbano",
    address: "Av. Nelson Freire, 2300 - Estados Unidos, Uberaba - MG",
    color: "#6366f1",
    cover: 8,
    description: "Degradês, freestyle e desenhos. A barbearia da quebrada com padrão de salão.",
    staff: [{ email: "dono@urbano.dev", name: "Kaique Silva", role: "OWNER", isBarber: true }],
    extraBarbers: ["Renan Duarte"],
    services: ["corte", "acabamento", "sobrancelha", "combo"],
    completed: 31,
  },
  {
    slug: "classica",
    name: "Barbearia Clássica",
    address: "Praça Rui Barbosa, 45 - Centro, Uberaba - MG",
    color: "#a8a29e",
    cover: 2,
    description: "Desde 1978 no centro de Uberaba. Navalha, toalha quente e muita conversa boa.",
    staff: [{ email: "dono@classica.dev", name: "Seu Antônio", role: "OWNER", isBarber: true }],
    extraBarbers: [],
    services: ["corte", "barba", "combo"],
    completed: 21,
  },
]

async function user(email: string, name: string) {
  return db.user.upsert({ where: { email }, create: { email, name, emailVerified: new Date() }, update: {} })
}

async function seedTenant(input: TenantSeed) {
  const existing = await db.tenant.findUnique({ where: { slug: input.slug } })
  if (existing) {
    return existing
  }
  const tenant = await db.tenant.create({
    data: {
      slug: input.slug,
      name: input.name,
      address: input.address,
      primaryColor: input.color,
      bannerUrl: `/demo/covers/cover-${input.cover}.svg`,
      description: input.description,
      phones: ["(34) 99999-0000", "(34) 3333-0000"],
    },
  })
  const services = await Promise.all(
    input.services.map((key) => db.service.create({ data: { ...SERVICES[key], tenantId: tenant.id } })),
  )
  const barbers: { name: string; userId?: string }[] = []
  for (const member of input.staff) {
    const u = await user(member.email, member.name)
    await db.membership.create({ data: { tenantId: tenant.id, userId: u.id, role: member.role } })
    if (member.isBarber) {
      barbers.push({ name: member.name, userId: u.id })
    }
  }
  barbers.push(...input.extraBarbers.map((name) => ({ name })))
  for (const barber of barbers) {
    await db.barber.create({
      data: {
        tenantId: tenant.id,
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
  await seedHistory(tenant.id, input.completed)
  return tenant
}

/** Histórico de atendimentos concluídos (alimenta "Populares" e o contador da vitrine). */
async function seedHistory(tenantId: string, count: number, userId?: string) {
  const barbers = await db.barber.findMany({ where: { tenantId } })
  const services = await db.service.findMany({ where: { tenantId } })
  const regular = userId ?? (await user(`frequente+${tenantId.slice(-6)}@exemplo.dev`, "Cliente Frequente")).id
  const customer = await db.customer.upsert({
    where: { tenantId_userId: { tenantId, userId: regular } },
    create: { tenantId, userId: regular, name: userId ? "Cliente Exemplo" : "Cliente Frequente" },
    update: {},
  })
  for (let i = 1; i <= count; i++) {
    const service = services[i % services.length]
    const startsAt = new Date(Date.now() - i * 86_400_000)
    // Histórico do cliente de exemplo fica às 11h UTC para não colidir com o da barbearia.
    startsAt.setUTCHours(userId ? 11 : 13 + (i % 6), 0, 0, 0)
    await db.booking.create({
      data: {
        tenantId,
        customerId: customer.id,
        barberId: barbers[i % barbers.length].id,
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
  const tenants = new Map<string, string>()
  for (const input of TENANTS) {
    const tenant = await seedTenant(input)
    tenants.set(input.slug, tenant.id)
  }

  const client = await user("cliente@exemplo.dev", "Cliente Exemplo")
  if ((await db.booking.count({ where: { customer: { userId: client.id } } })) === 0) {
    await seedHistory(tenants.get("zebu")!, 2, client.id)
    await seedHistory(tenants.get("vintage")!, 5, client.id)
    await db.favorite.create({ data: { userId: client.id, tenantId: tenants.get("dapper-den")! } })
  }

  console.log(`Seed concluído: ${TENANTS.length} barbearias (ex.: /t/zebu)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
