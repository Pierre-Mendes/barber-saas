import { describe, expect, it } from "vitest"
import { buildObjectKey, detectImageType, MAX_IMAGE_BYTES, validateImage } from "@/lib/storage/images"

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16])
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBPVP8 ")])
const SVG = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))

describe("image validation", () => {
  it("detects formats by magic bytes", () => {
    expect(detectImageType(PNG)?.mime).toBe("image/png")
    expect(detectImageType(JPG)?.ext).toBe("jpg")
    expect(detectImageType(WEBP)?.ext).toBe("webp")
  })

  it("rejects SVG (can carry script), empty and oversized files", () => {
    expect(validateImage(SVG)).toMatchObject({ ok: false })
    expect(validateImage(new Uint8Array())).toMatchObject({ ok: false })
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1)
    big.set(PNG)
    expect(validateImage(big)).toEqual({ ok: false, error: "Imagem maior que 5 MB." })
  })

  it("isolates object keys per barbershop and makes them unguessable", () => {
    const a = buildObjectKey("tenant-1", "logo", "png")
    const b = buildObjectKey("tenant-1", "logo", "png")
    expect(a).toMatch(/^tenants\/tenant-1\/logo\/[0-9a-f-]{36}\.png$/)
    expect(a).not.toBe(b)
  })
})

/**
 * Integração com um S3 real/compatível (SeaweedFS, MinIO, moto…).
 * Rode com: TEST_S3_ENDPOINT=http://localhost:8333 npm test
 */
describe.skipIf(!process.env.TEST_S3_ENDPOINT)("storage (S3-compatible)", async () => {
  process.env.S3_ENDPOINT = process.env.TEST_S3_ENDPOINT
  process.env.S3_BUCKET = `test-${Date.now()}`
  process.env.S3_ACCESS_KEY_ID ??= "test"
  process.env.S3_SECRET_ACCESS_KEY ??= "test"
  process.env.STORAGE_PUBLIC_URL = `${process.env.TEST_S3_ENDPOINT}/${process.env.S3_BUCKET}`
  const { removeTenantImage, storeTenantImage, StorageError } = await import("@/lib/storage")

  it("uploads a valid image and serves it at the public URL", async () => {
    const url = await storeTenantImage("tenant-1", "logo", new File([PNG], "logo.png"))
    expect(url).toMatch(new RegExp(`/tenants/tenant-1/logo/.+\\.png$`))
    const response = await fetch(url)
    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG)
  })

  it("rejects a disguised file even if the name says .png", async () => {
    await expect(storeTenantImage("tenant-1", "logo", new File([SVG], "evil.png"))).rejects.toBeInstanceOf(StorageError)
  })

  it("removes only images of the same barbershop", async () => {
    const url = await storeTenantImage("tenant-1", "banner", new File([JPG], "capa.jpg"))
    await removeTenantImage("tenant-2", url)
    expect((await fetch(url)).status).toBe(200)
    await removeTenantImage("tenant-1", url)
    expect((await fetch(url)).status).toBe(404)
  })
})
