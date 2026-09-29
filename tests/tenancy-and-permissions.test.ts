import { describe, expect, it } from "vitest"
import { assignableRoles, can, canManageMember } from "@/lib/auth/permissions"
import { isValidSlug, resolveHost, sessionCookieDomain, tenantRouteKey } from "@/lib/tenancy/host"

describe("resolveHost", () => {
  const root = "barber.app"

  it("treats the root and www as the platform", () => {
    expect(resolveHost("barber.app", root)).toEqual({ kind: "platform" })
    expect(resolveHost("www.barber.app:443", root)).toEqual({ kind: "platform" })
    expect(resolveHost(null, root)).toEqual({ kind: "platform" })
  })

  it("maps a subdomain to the barbershop slug", () => {
    expect(resolveHost("Navalha.Barber.App", root)).toEqual({ kind: "subdomain", slug: "navalha" })
  })

  it("does not treat reserved or nested subdomains as barbershops", () => {
    expect(resolveHost("admin.barber.app", root)).toEqual({ kind: "platform" })
    expect(resolveHost("a.b.barber.app", root)).toEqual({ kind: "platform" })
  })

  it("treats any other host as a custom domain", () => {
    const resolution = resolveHost("agenda.navalha.com.br", root)
    expect(resolution).toEqual({ kind: "custom", domain: "agenda.navalha.com.br" })
    expect(tenantRouteKey(resolution)).toBe("~agenda.navalha.com.br")
  })

  it("works with localhost subdomains in development", () => {
    expect(resolveHost("navalha.localhost:3000", "localhost:3000")).toEqual({ kind: "subdomain", slug: "navalha" })
    expect(resolveHost("localhost:3000", "localhost:3000")).toEqual({ kind: "platform" })
  })

  it("only shares the session cookie on real domains", () => {
    expect(sessionCookieDomain("barber.app")).toBe(".barber.app")
    expect(sessionCookieDomain("localhost:3000")).toBeUndefined()
  })

  it("validates slugs", () => {
    expect(isValidSlug("barbearia-do-ze")).toBe(true)
    expect(isValidSlug("api")).toBe(false)
    expect(isValidSlug("-ruim")).toBe(false)
    expect(isValidSlug("Maiuscula")).toBe(false)
  })
})

describe("permissions", () => {
  it("restricts settings to the owner", () => {
    expect(can("OWNER", "settings.manage")).toBe(true)
    expect(can("MANAGER", "settings.manage")).toBe(false)
  })

  it("lets reception manage every booking but not the team", () => {
    expect(can("RECEPTIONIST", "bookings.manageAll")).toBe(true)
    expect(can("RECEPTIONIST", "team.manage")).toBe(false)
  })

  it("limits barbers to their own schedule", () => {
    expect(can("BARBER", "schedule.manageOwn")).toBe(true)
    expect(can("BARBER", "schedule.manageAll")).toBe(false)
    expect(can("BARBER", "bookings.viewAll")).toBe(false)
    expect(can(null, "panel.access")).toBe(false)
  })

  it("prevents privilege escalation when assigning roles", () => {
    expect(assignableRoles("MANAGER")).toEqual(["RECEPTIONIST", "BARBER"])
    expect(assignableRoles("BARBER")).toEqual([])
    expect(canManageMember("MANAGER", "OWNER")).toBe(false)
    expect(canManageMember("OWNER", "MANAGER")).toBe(true)
  })
})
