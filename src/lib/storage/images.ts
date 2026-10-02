import { randomUUID } from "node:crypto"

/** Tamanho máximo de uma imagem enviada (logo, capa, serviço, barbeiro, foto de perfil). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export type ImageKind = "logo" | "banner" | "service" | "barber"

export interface ImageType {
  ext: "jpg" | "png" | "webp" | "avif"
  mime: string
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))

/**
 * Identifica o formato pelos bytes iniciais ("magic bytes"), não pela extensão nem pelo
 * Content-Type enviado pelo navegador. SVG e GIF ficam de fora de propósito (SVG pode
 * carregar script).
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { ext: "jpg", mime: "image/jpeg" }
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: "png", mime: "image/png" }
  }
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) {
    return { ext: "webp", mime: "image/webp" }
  }
  if (startsWith(bytes, ascii("ftypavif"), 4) || startsWith(bytes, ascii("ftypavis"), 4)) {
    return { ext: "avif", mime: "image/avif" }
  }
  return null
}

export type ImageValidation = { ok: true; type: ImageType } | { ok: false; error: string }

export function validateImage(bytes: Uint8Array): ImageValidation {
  if (bytes.byteLength === 0) {
    return { ok: false, error: "Arquivo vazio." }
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Imagem maior que 5 MB." }
  }
  const type = detectImageType(bytes)
  if (!type) {
    return { ok: false, error: "Formato não suportado. Envie JPG, PNG, WebP ou AVIF." }
  }
  return { ok: true, type }
}

/** Chave do objeto: isolada por barbearia e imprevisível. */
export function buildObjectKey(tenantId: string, kind: ImageKind, ext: ImageType["ext"]): string {
  return `tenants/${tenantId}/${kind}/${randomUUID()}.${ext}`
}

/** Chave da foto de perfil: isolada por usuário (não pertence a nenhuma barbearia). */
export function buildAvatarKey(userId: string, ext: ImageType["ext"]): string {
  return `users/${userId}/avatar/${randomUUID()}.${ext}`
}
