import Redis from "ioredis"

/** Operações mínimas de cache usadas pela aplicação (Redis em produção, memória em dev/testes). */
export interface CacheStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  del(...keys: string[]): Promise<void>
  /** Incrementa e, se a chave for nova, define a expiração. */
  incr(key: string, ttlSeconds?: number): Promise<number>
}

/** Store em memória do processo. Usado quando `REDIS_URL` não está definido. */
export class MemoryStore implements CacheStore {
  private readonly entries = new Map<string, { value: string; expiresAt: number | null }>()

  constructor(private readonly now: () => number = Date.now) {}

  private read(key: string) {
    const entry = this.entries.get(key)
    if (entry && entry.expiresAt !== null && entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry
  }

  async get(key: string): Promise<string | null> {
    return this.read(key)?.value ?? null
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 })
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.entries.delete(key)
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const entry = this.read(key)
    const next = Number(entry?.value ?? 0) + 1
    const expiresAt = entry ? entry.expiresAt : ttlSeconds ? this.now() + ttlSeconds * 1000 : null
    this.entries.set(key, { value: String(next), expiresAt })
    return next
  }
}

export class RedisStore implements CacheStore {
  constructor(private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds)
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.client.del(...keys)
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!ttlSeconds) {
      return this.client.incr(key)
    }
    const results = await this.client.multi().incr(key).expire(key, ttlSeconds, "NX").exec()
    return Number(results?.[0]?.[1] ?? 0)
  }

  async quit(): Promise<void> {
    await this.client.quit()
  }
}

export function createRedisStore(url: string): RedisStore {
  const client = new Redis(url, {
    // Comandos esperam a conexão inicial (senão o boot começa sem cache), mas com teto:
    // cache nunca pode travar a requisição.
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 1000,
  })
  client.on("error", (error) => console.error("[cache] redis:", error.message))
  return new RedisStore(client)
}

const globalForCache = globalThis as unknown as { cacheStore?: CacheStore }

/** Store único do processo: Redis se `REDIS_URL` estiver definido, senão memória. */
export function getStore(): CacheStore {
  globalForCache.cacheStore ??= process.env.REDIS_URL ? createRedisStore(process.env.REDIS_URL) : new MemoryStore()
  return globalForCache.cacheStore
}

/** Troca o store (testes). */
export function setStore(store: CacheStore): void {
  globalForCache.cacheStore = store
}
