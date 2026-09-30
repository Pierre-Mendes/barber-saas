import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { bumpVersion, cached, getVersion, invalidate, key } from "@/lib/cache"
import { cacheKeys, invalidateTenant, VERSION } from "@/lib/cache/keys"
import { rateLimit } from "@/lib/cache/rate-limit"
import { createRedisStore, MemoryStore, setStore, type CacheStore, type RedisStore } from "@/lib/cache/store"

const TEST_REDIS_URL = process.env.TEST_REDIS_URL

/** Mesma bateria contra memória e (se disponível) contra um Redis real. */
function suite(name: string, makeStore: () => CacheStore & { flush?: () => Promise<void> }) {
  describe.skipIf(name === "redis" && !TEST_REDIS_URL)(`cache (${name})`, () => {
    let store: CacheStore & { flush?: () => Promise<void> }

    beforeEach(async () => {
      store = makeStore()
      await store.flush?.()
      setStore(store)
    })

    afterAll(async () => {
      await (store as Partial<RedisStore>).quit?.()
      setStore(new MemoryStore())
    })

    it("loads once and serves the cached value, reviving dates", async () => {
      let calls = 0
      const loader = async () => {
        calls++
        return { name: "Zebu", createdAt: new Date("2026-01-02T03:04:05.000Z") }
      }
      const first = await cached(key("t", "a"), 60, loader)
      const second = await cached(key("t", "a"), 60, loader)
      expect(calls).toBe(1)
      expect(second.createdAt).toBeInstanceOf(Date)
      expect(second).toEqual(first)
    })

    it("caches null results too (unknown slug does not hit the database every time)", async () => {
      let calls = 0
      await cached(key("t", "missing"), 60, async () => (calls++, null))
      expect(await cached(key("t", "missing"), 60, async () => (calls++, null))).toBeNull()
      expect(calls).toBe(1)
    })

    it("invalidates a key and a whole group by version", async () => {
      expect(await getVersion("g")).toBe(0)
      await bumpVersion("g")
      expect(await getVersion("g")).toBe(1)
      await cached(key("t", "b"), 60, async () => 1)
      await invalidate(key("t", "b"))
      expect(await cached(key("t", "b"), 60, async () => 2)).toBe(2)
    })

    it("clears slug and custom-domain lookups and bumps schedule/marketplace on tenant change", async () => {
      const tenant = { id: "t1", slug: "zebu", customDomain: "agenda.zebubarber.com.br" }
      await store.set(cacheKeys.tenantByRouteKey("zebu"), "{}", 60)
      await store.set(cacheKeys.tenantByRouteKey("~agenda.zebubarber.com.br"), "{}", 60)
      await invalidateTenant(tenant)
      expect(await store.get(cacheKeys.tenantByRouteKey("zebu"))).toBeNull()
      expect(await store.get(cacheKeys.tenantByRouteKey("~agenda.zebubarber.com.br"))).toBeNull()
      expect(await getVersion(VERSION.schedule("t1"))).toBe(1)
      expect(await getVersion(VERSION.marketplace)).toBe(1)
    })

    it("rate limits within the window, per identifier", async () => {
      const rule = { limit: 2, windowSeconds: 60 }
      expect((await rateLimit("test", "A@x.com", rule)).ok).toBe(true)
      expect((await rateLimit("test", "a@x.com", rule)).ok).toBe(true)
      expect((await rateLimit("test", "a@x.com", rule)).ok).toBe(false)
      expect((await rateLimit("test", "b@x.com", rule)).ok).toBe(true)
    })
  })
}

suite("memory", () => new MemoryStore())
suite("redis", () => {
  const redis = createRedisStore(TEST_REDIS_URL!)
  return Object.assign(redis, {
    flush: async () => {
      await (redis as unknown as { client: { flushdb: () => Promise<unknown> } }).client.flushdb()
    },
  })
})

describe("fail-open", () => {
  it("falls back to the loader when the store is down", async () => {
    const broken: CacheStore = {
      get: async () => {
        throw new Error("down")
      },
      set: async () => {
        throw new Error("down")
      },
      del: async () => {
        throw new Error("down")
      },
      incr: async () => {
        throw new Error("down")
      },
    }
    setStore(broken)
    expect(await cached(key("x"), 60, async () => 42)).toBe(42)
    expect((await rateLimit("x", "y", { limit: 1, windowSeconds: 1 })).ok).toBe(true)
    setStore(new MemoryStore())
  })

  it("expires entries in memory", async () => {
    let now = 0
    const store = new MemoryStore(() => now)
    await store.set("k", "v", 10)
    now = 9_000
    expect(await store.get("k")).toBe("v")
    now = 10_001
    expect(await store.get("k")).toBeNull()
  })
})
