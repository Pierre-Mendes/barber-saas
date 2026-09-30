import { getStore } from "./store"

/**
 * Cache com invalidação por versão.
 *
 * - Toda operação é "fail-open": se o Redis cair, a aplicação consulta o banco normalmente.
 * - Valores são JSON; strings em formato ISO voltam como `Date`. Não guarde `Decimal` do Prisma
 *   (vira string): converta antes.
 * - Grupos de chaves são invalidados trocando a versão que entra na chave (`bumpVersion`),
 *   sem precisar varrer o Redis.
 */

const PREFIX = process.env.CACHE_PREFIX ?? "bs"
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const NULL_MARKER = "__null__"

let warned = false
function warn(error: unknown): void {
  if (!warned) {
    console.error("[cache] indisponível, seguindo sem cache:", error instanceof Error ? error.message : error)
    warned = true
  }
}

export function key(...parts: (string | number)[]): string {
  return [PREFIX, ...parts].join(":")
}

function revive(_key: string, value: unknown): unknown {
  return typeof value === "string" && ISO_DATE.test(value) ? new Date(value) : value
}

/** Lê do cache ou executa `loader` e guarda o resultado por `ttlSeconds`. `null` também é guardado. */
export async function cached<T>(cacheKey: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const store = getStore()
  try {
    const hit = await store.get(cacheKey)
    if (hit !== null) {
      return (hit === NULL_MARKER ? null : JSON.parse(hit, revive)) as T
    }
  } catch (error) {
    warn(error)
    return loader()
  }
  const value = await loader()
  try {
    await store.set(cacheKey, value === null ? NULL_MARKER : JSON.stringify(value), ttlSeconds)
  } catch (error) {
    warn(error)
  }
  return value
}

export async function invalidate(...cacheKeys: string[]): Promise<void> {
  try {
    await getStore().del(...cacheKeys)
  } catch (error) {
    warn(error)
  }
}

/** Versão atual de um grupo de chaves (0 se nunca invalidado). */
export async function getVersion(name: string): Promise<number> {
  try {
    return Number((await getStore().get(key("v", name))) ?? 0)
  } catch (error) {
    warn(error)
    return 0
  }
}

/** Invalida um grupo inteiro: as chaves antigas simplesmente deixam de ser lidas e expiram. */
export async function bumpVersion(...names: string[]): Promise<void> {
  try {
    await Promise.all(names.map((name) => getStore().incr(key("v", name))))
  } catch (error) {
    warn(error)
  }
}
