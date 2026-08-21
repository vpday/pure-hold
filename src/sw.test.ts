import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createTiantianFundMarketDataCacheKey,
  handleTiantianFundMarketDataPostRequest,
  matchesTiantianFundMarketDataPostRequest,
  tiantianFundMarketDataEndpoint,
} from './pwa/cache/tiantianFundMarketDataPostCacheAdapter.ts'
import {
  handleTiantianMmGetRequest,
  matchesTiantianMmGetRequest,
} from './pwa/cache/tiantianMmGetCacheAdapter.ts'
import {
  cacheResponseCachedAtHeader,
  cacheResponseFallbackHeader,
  cacheResponseSourceHeader,
  readCacheResponseMetadata,
} from './shared/transport/cacheResponseMetadata.ts'
import { handleCacheFetchEvent } from './sw.ts'

test('matches only the intended Tiantian GET and market data response POST requests', () => {
  assert.equal(
    matchesTiantianMmGetRequest(new Request('https://fundcomapi.tiantianfunds.com/mm')),
    true,
  )
  assert.equal(
    matchesTiantianMmGetRequest(new Request('https://fundcomapi.tiantianfunds.com/mm/FundMNewApi')),
    true,
  )
  assert.equal(
    matchesTiantianMmGetRequest(
      new Request('https://fundcomapi.tiantianfunds.com/mm/FundFavor/FundFavorInfo', {
        method: 'POST',
      }),
    ),
    false,
  )
  assert.equal(
    matchesTiantianFundMarketDataPostRequest(
      new Request(tiantianFundMarketDataEndpoint, {
        body: 'CODES=000001&deviceid=device',
        headers: { 'Content-Type': 'Application/X-WWW-Form-Urlencoded; charset=UTF-8' },
        method: 'POST',
      }),
    ),
    true,
  )
  assert.equal(
    matchesTiantianFundMarketDataPostRequest(
      new Request('https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundBaseInfos', {
        body: 'CODES=000001&deviceid=device',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      }),
    ),
    false,
  )
})

test('service worker responds only when the cache registry resolves one route', async () => {
  const request = new Request('https://example.com/request')
  const responses: Promise<Response>[] = []
  const event = {
    request,
    respondWith(response: Promise<Response> | Response): void {
      responses.push(Promise.resolve(response))
    },
  }

  handleCacheFetchEvent(event, { resolve: () => ({ handled: false }) })
  assert.equal(responses.length, 0)

  handleCacheFetchEvent(event, {
    resolve: () => ({
      handled: true,
      route: {
        handle: async () => new Response('handled'),
        id: 'test-route',
        matches: () => true,
      },
    }),
  })
  assert.equal(responses.length, 1)
  assert.equal(await (await responses[0]!).text(), 'handled')
})

test('applies the shared cache policy to Tiantian GET responses without fund response metadata', async () => {
  const cacheStorage = installCaches()
  const requestUrl = 'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundBaseInfos'
  let fetchCalls = 0
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    fetchCalls += 1
    return new Response(fetchCalls === 1 ? 'first' : 'forced', { status: 200 })
  }
  try {
    const first = await handleTiantianMmGetRequest(new Request(requestUrl))
    assert.equal(await first.text(), 'first')
    assert.equal(first.headers.get(cacheResponseSourceHeader), null)

    const cached = await handleTiantianMmGetRequest(new Request(requestUrl))
    assert.equal(await cached.text(), 'first')
    assert.equal(fetchCalls, 1)

    const forced = await handleTiantianMmGetRequest(new Request(requestUrl, { cache: 'no-store' }))
    assert.equal(await forced.text(), 'forced')
    assert.equal(fetchCalls, 2)

    globalThis.fetch = async () => {
      throw new Error('offline')
    }
    const fallback = await handleTiantianMmGetRequest(
      new Request(requestUrl, { cache: 'no-store' }),
    )
    assert.equal(await fallback.text(), 'forced')
    assert.equal(fallback.headers.get(cacheResponseFallbackHeader), null)
    assert.equal(cacheStorage.caches.size, 2)
  } finally {
    globalThis.fetch = originalFetch
    restoreCaches()
  }
})

test('reads transport metadata and falls back to network time when headers are absent', () => {
  const before = Date.now()
  const network = readCacheResponseMetadata(new Response())
  const after = Date.now()
  assert.equal(network.source, 'network')
  assert.ok(network.fetchedAt >= before && network.fetchedAt <= after)

  const fallback = readCacheResponseMetadata(
    new Response(null, {
      headers: {
        [cacheResponseCachedAtHeader]: '456',
        [cacheResponseFallbackHeader]: 'true',
      },
    }),
  )
  assert.deepEqual(fallback, { fetchedAt: 456, source: 'cache-fallback' })
})

test('normalizes market data form bodies and keeps endpoint, device and batch in the key', async () => {
  const first = await createTiantianFundMarketDataCacheKey(
    createMarketDataRequest('device-a', '000001,000002', 'FIELDS', 'default'),
  )
  const reordered = await createTiantianFundMarketDataCacheKey(
    createMarketDataRequest('device-a', '000001,000002', 'FIELDS', 'default', true),
  )
  const differentBatch = await createTiantianFundMarketDataCacheKey(
    createMarketDataRequest('device-a', '000003', 'FIELDS', 'default'),
  )
  const differentDevice = await createTiantianFundMarketDataCacheKey(
    createMarketDataRequest('device-b', '000001,000002', 'FIELDS', 'default'),
  )

  assert.equal(first.url, reordered.url)
  assert.notEqual(first.url, differentBatch.url)
  assert.notEqual(first.url, differentDevice.url)
  assert.equal(first.method, 'GET')
})

test('serves fresh market data response cache, bypasses it for no-store, and returns a cache fallback on failure', async () => {
  const cacheStorage = installCaches()
  const request = createMarketDataRequest('device', '000001', 'FIELDS', 'default')
  let fetchCalls = 0
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    fetchCalls += 1
    return new Response(fetchCalls === 1 ? 'first' : 'forced', { status: 200 })
  }
  try {
    const first = await handleTiantianFundMarketDataPostRequest(request)
    assert.equal(await first.text(), 'first')
    assert.equal(first.headers.get(cacheResponseSourceHeader), 'network')
    const cachedAt = first.headers.get(cacheResponseCachedAtHeader)
    assert.match(cachedAt ?? '', /^\d+$/)

    const cached = await handleTiantianFundMarketDataPostRequest(request)
    assert.equal(await cached.text(), 'first')
    assert.equal(cached.headers.get(cacheResponseSourceHeader), 'cache')
    assert.equal(cached.headers.get(cacheResponseCachedAtHeader), cachedAt)
    assert.equal(fetchCalls, 1)

    const forced = await handleTiantianFundMarketDataPostRequest(
      createMarketDataRequest('device', '000001', 'FIELDS', 'no-store'),
    )
    assert.equal(await forced.text(), 'forced')
    assert.equal(forced.headers.get(cacheResponseSourceHeader), 'network')
    const forcedCachedAt = forced.headers.get(cacheResponseCachedAtHeader)
    assert.equal(fetchCalls, 2)

    globalThis.fetch = async () => {
      throw new Error('offline')
    }
    const fallback = await handleTiantianFundMarketDataPostRequest(
      createMarketDataRequest('device', '000001', 'FIELDS', 'no-store'),
    )
    assert.equal(await fallback.text(), 'forced')
    assert.equal(fallback.headers.get(cacheResponseSourceHeader), 'cache-fallback')
    assert.equal(fallback.headers.get(cacheResponseFallbackHeader), 'true')
    assert.equal(fallback.headers.get(cacheResponseCachedAtHeader), forcedCachedAt)
    assert.equal(cacheStorage.caches.size, 2)
  } finally {
    globalThis.fetch = originalFetch
    restoreCaches()
  }
})

test('does not cache non-200 responses and removes expired market data entries after an offline failure', async () => {
  const cacheStorage = installCaches()
  const request = createMarketDataRequest('device', '000001', 'FIELDS', 'default')
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('error', { status: 503 })
  try {
    const nonOk = await handleTiantianFundMarketDataPostRequest(request)
    assert.equal(nonOk.status, 503)
    const responseCache = await cacheStorage.open('pure-hold-fund-snapshot-v1')
    assert.equal((await responseCache.keys()).length, 0)

    globalThis.fetch = async () => new Response('network', { status: 200 })
    await handleTiantianFundMarketDataPostRequest(request)
    const key = await createTiantianFundMarketDataCacheKey(request)
    const metadataCache = cacheStorage.caches.get('pure-hold-fund-snapshot-metadata-v1')!
    await metadataCache.put(key, new Response(String(Date.now() - 25 * 60 * 60 * 1000)))

    globalThis.fetch = async () => {
      throw new Error('offline')
    }
    await assert.rejects(handleTiantianFundMarketDataPostRequest(request), /offline/)
    assert.equal((await responseCache.keys()).length, 0)
  } finally {
    globalThis.fetch = originalFetch
    restoreCaches()
  }
})

test('returns the network response when cache writes fail and prunes market data batches independently', async () => {
  const cacheStorage = installCaches()
  const originalFetch = globalThis.fetch
  try {
    const responseCache = await cacheStorage.open('pure-hold-fund-snapshot-v1')
    responseCache.failPuts = true
    globalThis.fetch = async () => new Response('network', { status: 200 })
    const response = await handleTiantianFundMarketDataPostRequest(
      createMarketDataRequest('device', '000001', 'FIELDS', 'default'),
    )
    assert.equal(await response.text(), 'network')
    assert.equal((await responseCache.keys()).length, 0)

    responseCache.failPuts = false
    for (let index = 0; index < 101; index += 1) {
      globalThis.fetch = async () => new Response(String(index), { status: 200 })
      await handleTiantianFundMarketDataPostRequest(
        createMarketDataRequest('device', String(index).padStart(6, '0'), 'FIELDS', 'default'),
      )
    }
    assert.equal((await responseCache.keys()).length, 100)
  } finally {
    globalThis.fetch = originalFetch
    restoreCaches()
  }
})

function createMarketDataRequest(
  deviceId: string,
  codes: string,
  fields: string,
  cache: RequestCache,
  reverse = false,
): Request {
  const params = new URLSearchParams()
  const entries = [
    ['deviceid', deviceId],
    ['CODES', codes],
    ['FIELDS', fields],
  ] as const
  for (const [key, value] of reverse ? [...entries].reverse() : entries) {
    params.append(key, value)
  }
  return new Request(tiantianFundMarketDataEndpoint, {
    body: params,
    cache,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  })
}

function installCaches(): MemoryCacheStorage {
  const storage = new MemoryCacheStorage()
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: storage })
  return storage
}

function restoreCaches(): void {
  Reflect.deleteProperty(globalThis, 'caches')
}

class MemoryCacheStorage {
  readonly caches = new Map<string, MemoryCache>()
  async open(name: string): Promise<MemoryCache> {
    const cache = this.caches.get(name) ?? new MemoryCache()
    this.caches.set(name, cache)
    return cache
  }
}

class MemoryCache {
  readonly values = new Map<string, Response>()
  failPuts = false

  async match(request: Request): Promise<Response | undefined> {
    return this.values.get(request.url)?.clone()
  }

  async put(request: Request, response: Response): Promise<void> {
    if (this.failPuts) throw new Error('cache write failed')
    this.values.set(request.url, response.clone())
  }

  async delete(request: Request): Promise<boolean> {
    return this.values.delete(request.url)
  }

  async keys(): Promise<Request[]> {
    return [...this.values.keys()].map((url) => new Request(url))
  }
}
