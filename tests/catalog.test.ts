import { describe, expect, it } from "vitest"
import { findCategory, serviceFallbackImage, tenantFallbackCover } from "@/lib/catalog"

describe("catalog", () => {
  it("picks an illustration from the service name", () => {
    expect(serviceFallbackImage("Corte + Barba")).toBe("/demo/services/combo.svg")
    expect(serviceFallbackImage("Barba completa")).toBe("/demo/services/barba.svg")
    expect(serviceFallbackImage("Corte degradê")).toBe("/demo/services/cabelo.svg")
    expect(serviceFallbackImage("Hidratação capilar")).toBe("/demo/services/hidratacao.svg")
    expect(serviceFallbackImage("Luzes")).toBe("/demo/services/cabelo.svg")
  })

  it("gives each barbershop a stable fallback cover", () => {
    const cover = tenantFallbackCover("tenant-abc")
    expect(cover).toMatch(/^\/demo\/covers\/cover-[1-8]\.svg$/)
    expect(tenantFallbackCover("tenant-abc")).toBe(cover)
  })

  it("resolves quick-search categories by slug", () => {
    expect(findCategory("barba")?.keywords).toContain("barba")
    expect(findCategory("inexistente")).toBeUndefined()
    expect(findCategory(undefined)).toBeUndefined()
  })
})
