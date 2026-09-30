/**
 * Testes de integração do fluxo de agendamento contra um Postgres real
 * (a constraint anti-sobreposição só existe no banco).
 * Rode com: TEST_DATABASE_URL=postgresql://... npm test
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DATABASE_URL)("booking service (database)", async () => {
  process.env.DATABASE_URL = TEST_DATABASE_URL
  const { db } = await import("@/lib/db")
  const { BookingError, cancelBooking, createBooking, getAvailableSlots } = await import("@/lib/booking/service")
  const { zonedToUtc } = await import("@/lib/scheduling/time")

  const SP = "America/Sao_Paulo"
  const DAY = "2030-01-07" // segunda-feira
  const now = new Date("2030-01-01T12:00:00Z")
  let ids: { tenantId: string; otherTenantId: string; barberId: string; serviceId: string; userId: string }

  async function reset() {
    await db.$executeRawUnsafe(
      'TRUNCATE "Booking","Customer","TimeOff","WorkingHours","BarberService","Barber","Service","Membership","Favorite","Tenant","User" CASCADE',
    )
  }

  beforeAll(reset)
  afterAll(async () => {
    await reset()
    await db.$disconnect()
  })

  beforeEach(async () => {
    await reset()
    const user = await db.user.create({ data: { email: "cliente@teste.com", name: "Cliente" } })
    const tenant = await db.tenant.create({
      data: { slug: "zebu", name: "Zebu", timezone: SP, minCancelHours: 2, slotIntervalMinutes: 30 },
    })
    const other = await db.tenant.create({ data: { slug: "outra", name: "Outra" } })
    const service = await db.service.create({
      data: { tenantId: tenant.id, name: "Corte", price: 50, durationMinutes: 30 },
    })
    const barber = await db.barber.create({
      data: {
        tenantId: tenant.id,
        name: "Zé",
        services: { create: { serviceId: service.id } },
        workingHours: { create: { weekday: 1, startMinute: 9 * 60, endMinute: 11 * 60 } },
      },
    })
    ids = { tenantId: tenant.id, otherTenantId: other.id, barberId: barber.id, serviceId: service.id, userId: user.id }
  })

  const book = (minute: number, overrides: Partial<Parameters<typeof createBooking>[0]> = {}) =>
    createBooking({
      tenantId: ids.tenantId,
      userId: ids.userId,
      barberId: ids.barberId,
      serviceId: ids.serviceId,
      startsAt: zonedToUtc(DAY, minute, SP),
      customerName: "Cliente",
      now,
      ...overrides,
    })

  it("books a free slot and removes it from availability", async () => {
    const before = await getAvailableSlots({ ...ids, date: DAY, now })
    expect(before).toHaveLength(4)

    const booking = await book(9 * 60)
    expect(booking.endsAt.getTime() - booking.startsAt.getTime()).toBe(30 * 60_000)
    expect(Number(booking.price)).toBe(50)

    const after = await getAvailableSlots({ ...ids, date: DAY, now })
    expect(after).toHaveLength(3)
  })

  it("rejects a slot outside working hours", async () => {
    await expect(book(12 * 60)).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" })
  })

  it("does not let another tenant book this barber", async () => {
    await expect(book(9 * 60, { tenantId: ids.otherTenantId })).rejects.toBeInstanceOf(BookingError)
  })

  it("prevents double booking under concurrency via the database constraint", async () => {
    const results = await Promise.allSettled([book(9 * 60), book(9 * 60), book(9 * 60)])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected")
    for (const r of rejected) {
      expect(["SLOT_TAKEN", "SLOT_UNAVAILABLE"], String(r.reason?.message ?? r.reason)).toContain(r.reason.code)
    }
    expect(await db.booking.count()).toBe(1)
  })

  it("frees the slot after cancellation and enforces the customer deadline", async () => {
    const booking = await book(9 * 60)

    const tooLate = zonedToUtc(DAY, 8 * 60, SP)
    await expect(cancelBooking(booking.id, { kind: "customer", userId: ids.userId }, tooLate)).rejects.toMatchObject({
      code: "CANCEL_TOO_LATE",
    })

    const stranger = await db.user.create({ data: { email: "outro@teste.com" } })
    await expect(cancelBooking(booking.id, { kind: "customer", userId: stranger.id }, now)).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    await cancelBooking(booking.id, { kind: "customer", userId: ids.userId }, now)
    await expect(book(9 * 60)).resolves.toBeTruthy()
  })

  it("keeps one customer record per barbershop", async () => {
    await book(9 * 60)
    await book(10 * 60)
    expect(await db.customer.count({ where: { tenantId: ids.tenantId } })).toBe(1)
  })
})
