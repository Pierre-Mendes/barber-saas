import { describe, expect, it } from "vitest"
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "@/lib/auth/password"
import { cancellationDeadline, canCustomerCancel, describeCancellationPolicy, type CancellationRules } from "@/lib/booking/policy"

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("barber123")
    expect(hash).toMatch(/^scrypt\$/)
    expect(await verifyPassword("barber123", hash)).toBe(true)
    expect(await verifyPassword("barber124", hash)).toBe(false)
  })

  it("salts each hash", async () => {
    expect(await hashPassword("mesma-senha")).not.toBe(await hashPassword("mesma-senha"))
  })

  it("never matches a missing, malformed or dummy hash", async () => {
    expect(await verifyPassword("x", null)).toBe(false)
    expect(await verifyPassword("x", "bcrypt$abc")).toBe(false)
    expect(await verifyPassword("", DUMMY_PASSWORD_HASH)).toBe(false)
  })
})

describe("cancellation policy", () => {
  const createdAt = new Date("2030-01-01T12:00:00Z")
  const startsAt = new Date("2030-01-02T12:00:00Z")
  const booking = { createdAt, startsAt, status: "CONFIRMED" as const }
  const rules = (overrides: Partial<CancellationRules>): CancellationRules => ({
    cancellationPolicy: "HOURS_BEFORE_START",
    minCancelHours: 2,
    cancelWindowMinutes: 60,
    ...overrides,
  })
  const at = (iso: string) => new Date(iso)

  it("hours before start", () => {
    expect(cancellationDeadline(rules({}), booking)).toEqual(at("2030-01-02T10:00:00Z"))
    expect(canCustomerCancel(rules({}), booking, at("2030-01-02T09:59:00Z"))).toBe(true)
    expect(canCustomerCancel(rules({}), booking, at("2030-01-02T10:01:00Z"))).toBe(false)
  })

  it("window after booking (e.g. 1h after booking)", () => {
    const window = rules({ cancellationPolicy: "WINDOW_AFTER_BOOKING" })
    expect(cancellationDeadline(window, booking)).toEqual(at("2030-01-01T13:00:00Z"))
    expect(canCustomerCancel(window, booking, at("2030-01-01T12:59:00Z"))).toBe(true)
    expect(canCustomerCancel(window, booking, at("2030-01-01T13:01:00Z"))).toBe(false)
  })

  it("window never goes past the start time", () => {
    const soon = { ...booking, startsAt: at("2030-01-01T12:30:00Z") }
    const window = rules({ cancellationPolicy: "WINDOW_AFTER_BOOKING" })
    expect(cancellationDeadline(window, soon)).toEqual(soon.startsAt)
    expect(canCustomerCancel(window, soon, at("2030-01-01T12:45:00Z"))).toBe(false)
  })

  it("none: only the barbershop cancels", () => {
    const none = rules({ cancellationPolicy: "NONE" })
    expect(cancellationDeadline(none, booking)).toBeNull()
    expect(canCustomerCancel(none, booking, createdAt)).toBe(false)
  })

  it("only confirmed bookings can be cancelled", () => {
    expect(canCustomerCancel(rules({}), { ...booking, status: "CANCELLED" }, createdAt)).toBe(false)
  })

  it("describes each rule for the customer", () => {
    expect(describeCancellationPolicy(rules({}))).toContain("2h antes")
    expect(describeCancellationPolicy(rules({ cancellationPolicy: "WINDOW_AFTER_BOOKING" }))).toContain("1 hora depois de agendar")
    expect(describeCancellationPolicy(rules({ cancellationPolicy: "WINDOW_AFTER_BOOKING", cancelWindowMinutes: 30 }))).toContain(
      "30 minutos",
    )
    expect(describeCancellationPolicy(rules({ cancellationPolicy: "NONE" }))).toContain("falando com a barbearia")
  })
})
