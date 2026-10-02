import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

const KEY_LENGTH = 64
export const MIN_PASSWORD_LENGTH = 8

/** Hash `scrypt$<salt>$<hash>` (base64url). Usa só `node:crypto`, sem dependência nativa. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH)
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`
}

/** Compara em tempo constante. Hash ausente ou malformado nunca confere. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored?.split("$") ?? []
  if (scheme !== "scrypt" || !saltB64 || !hashB64) {
    return false
  }
  const expected = Buffer.from(hashB64, "base64url")
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64url"), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar contas. */
export const DUMMY_PASSWORD_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86)
