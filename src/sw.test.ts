import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createTiantianFundSnapshotCacheKey,
  handleTiantianFundSnapshotRequest,
  isCacheableApiRequest,
  isTiantianFundSnapshotRequest,
  snapshotCacheFallbackHeader,
  snapshotCachedAtHeader,
  snapshotDataSourceHeader,
  tiantianFundSnapshotEndpoint,
} from './sw.ts'

test('matches only the intended Tiantian GET and snapshot POST requests', () => {
  assert.equal(isCacheableApiRequest(new Request('https://fundcomapi.tiantianfunds.com/mm')), true)
  assert.equal(
    isCacheableApiRequest(new Request('https://fundcomapi.tiantianfunds.com/mm/FundMNewApi')),
    true,
  )
  assert.equal(
    isCacheableApiRequest(
      new Request('https://fundcomapi.tiantianfunds.com/mm/FundFavor/FundFavorInfo', {
        method: 'POST',
      }),
    ),
    false,
  )
  assert.equal(
    isTiantianFundSnapshotRequest(
      new Request(tiantianFundSnapshotEndpoint, {
        body: 'CODES=000001&deviceid=device',
        headers: { 'Content-Type': 'Application/X-WWW-Form-Urlencoded; charset=UTF-8' },
        method: 'POST',
      }),
    ),
    true,
  )
  assert.equal(
    isTiantianFundSnapshotRequest(
      new Request('https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundBaseInfos', {
        body: 'CODES=000001&deviceid=device',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      }),
    ),
    false,
  )
})

test('normalizes snapshot form bodies and keeps endpoint, device and batch in the key', async () => {
  const first = await createTiantianFundSnapshotCacheKey(
    createSnapshotRequest('device-a', '000001,000002', 'FIELDS', 'default'),
  )
  const reordered = await createTiantianFundSnapshotCacheKey(
    createSnapshotRequest('device-a', '000001,000002', 'FIELDS', 'default', true),
  )
  const differentBatch = await createTiantianFundSnapshotCacheKey(
    createSnapshotRequest('device-a', '000003', 'FIELDS', 'default'),
  )
  const differentDevice = await createTiantianFundSnapshotCacheKey(
    createSnapshotRequest('device-b', '000001,000002', 'FIELDS', 'default'),
  )

  assert.equal(first.url, reordered.url)
  assert.notEqual(first.url, differentBatch.url)
  assert.notEqual(first.url, differentDevice.url)
  assert.equal(first.method, 'GET')
})

test('serves fresh cache, bypasses it for no-store, and returns a cache fallback on failure', async () => {
  const cacheStorage = installCaches()
  const request = createSnapshotRequest('device', '000001', 'FIELDS', 'default')
  let fetchCalls = 0
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    fetchCalls += 1
    return new Response(fetchCalls === 1 ? 'first' : 'forced', { status: 200 })
  }
  try {
    const first = await handleTiantianFundSnapshotRequest(request)
    assert.equal(await first.text(), 'first')
    assert.equal(first.headers.get(snapshotDataSourceHeader), 'network')
    const cachedAt = first.headers.get(snapshotCachedAtHeader)
    assert.match(cachedAt ?? '', /^\d+$/)

    const cached = await handleTiantianFundSnapshotRequest(request)
    assert.equal(await cached.text(), 'first')
    assert.equal(cached.headers.get(snapshotDataSourceHeader), 'cache')
    assert.equal(cached.headers.get(snapshotCachedAtHeader), cachedAt)
    assert.equal(fetchCalls, 1)

    const forced = await handleTiantianFundSnapshotRequest(
      createSnapshotRequest('device', '000001', 'FIELDS', 'no-store'),
    )
    assert.equal(await forced.text(), 'forced')
    assert.equal(forced.headers.get(snapshotDataSourceHeader), 'network')
    const forcedCachedAt = forced.headers.get(snapshotCachedAtHeader)
    assert.equal(fetchCalls, 2)

    globalThis.fetch = async () => {
      throw new Error('offline')
    }
    const fallback = await handleTiantianFundSnapshotRequest(
      createSnapshotRequest('device', '000001', 'FIELDS', 'no-store'),
    )
    assert.equal(await fallback.text(), 'forced')
    assert.equal(fallback.headers.get(snapshotDataSourceHeader), 'cache-fallback')
    assert.equal(fallback.headers.get(snapshotCacheFallbackHeader), 'true')
    assert.equal(fallback.headers.get(snapshotCachedAtHeader), forcedCachedAt)
    assert.equal(cacheStorage.caches.size, 2)
  } finally {
    globalThis.fetch = originalFetch
    restoreCaches()
  }
})

test('does not cache non-200 responses and removes expired entries after an offline failure', async () => {
  const cacheStorage = installCaches()
  const request = createSnapshotRequest('device', '000001', 'FIELDS', 'default')
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('error', { status: 503 })
  try {
    const nonOk = await handleTiantianFundSnapshotRequest(request)
    assert.equal(nonOk.status, 503)
    const snapshotCache = await cacheStorage.open('pure-hold-fund-snapshot-v1')
    assert.equal((await snapshotCache.keys()).length, 0)

    globalThis.fetch = async () => new Response('network', { status: 200 })
    await handleTiantianFundSnapshotRequest(request)
    const key = await createTiantianFundSnapshotCacheKey(request)
    const metadataCache = cacheStorage.caches.get('pure-hold-fund-snapshot-metadata-v1')!
    await metadataCache.put(key, new Response(String(Date.now() - 25 * 60 * 60 * 1000)))

    globalThis.fetch = async () => {
      throw new Error('offline')
    }
    await assert.rejects(handleTiantianFundSnapshotRequest(request), /offline/)
    assert.equal((await snapshotCache.keys()).length, 0)
  } finally {
    globalThis.fetch = originalFetch
    restoreCaches()
  }
})

test('returns the network response when cache writes fail and prunes snapshot batches independently', async () => {
  const cacheStorage = installCaches()
  const originalFetch = globalThis.fetch
  try {
    const snapshotCache = await cacheStorage.open('pure-hold-fund-snapshot-v1')
    snapshotCache.failPuts = true
    globalThis.fetch = async () => new Response('network', { status: 200 })
    const response = await handleTiantianFundSnapshotRequest(
      createSnapshotRequest('device', '000001', 'FIELDS', 'default'),
    )
    assert.equal(await response.text(), 'network')
    assert.equal((await snapshotCache.keys()).length, 0)

    snapshotCache.failPuts = false
    for (let index = 0; index < 101; index += 1) {
      globalThis.fetch = async () => new Response(String(index), { status: 200 })
      await handleTiantianFundSnapshotRequest(
        createSnapshotRequest('device', String(index).padStart(6, '0'), 'FIELDS', 'default'),
      )
    }
    assert.equal((await snapshotCache.keys()).length, 100)
  } finally {
    globalThis.fetch = originalFetch
    restoreCaches()
  }
})

function createSnapshotRequest(
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
  return new Request(tiantianFundSnapshotEndpoint, {
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
