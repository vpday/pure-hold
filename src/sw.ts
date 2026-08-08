type ManifestEntry = string | { revision?: string; url: string }

declare global {
  interface Window {
    __WB_MANIFEST: ManifestEntry[]
  }
}

type ExtendableEventLike = Event & {
  waitUntil(promise: Promise<unknown>): void
}

type FetchEventLike = ExtendableEventLike & {
  request: Request
  respondWith(response: Promise<Response> | Response): void
}

type MessageEventLike = ExtendableEventLike & {
  data: unknown
}

type ServiceWorkerScope = typeof globalThis & {
  __WB_MANIFEST: ManifestEntry[]
  clients: {
    claim(): Promise<void>
  }
  skipWaiting(): Promise<void>
  addEventListener(type: 'activate', listener: (event: ExtendableEventLike) => void): void
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void
  addEventListener(type: 'message', listener: (event: MessageEventLike) => void): void
}

export const tiantianFundSnapshotEndpoint =
  'https://fundcomapi.tiantianfunds.com/mm/FundFavor/FundFavorInfo'
export const snapshotDataSourceHeader = 'X-Pure-Hold-Data-Source'
export const snapshotCachedAtHeader = 'X-Pure-Hold-Cached-At'
export const snapshotCacheFallbackHeader = 'X-Pure-Hold-Cache-Fallback'

const serviceWorker = globalThis as ServiceWorkerScope
const apiCacheName = 'pure-hold-api-v1'
const apiMetadataCacheName = 'pure-hold-api-metadata-v1'
const snapshotCacheName = 'pure-hold-fund-snapshot-v1'
const snapshotMetadataCacheName = 'pure-hold-fund-snapshot-metadata-v1'
const freshDuration = 10 * 60 * 1000
const maximumRetention = 24 * 60 * 60 * 1000
const maximumEntries = 100
const isServiceWorkerRuntime =
  typeof self !== 'undefined' && 'clients' in serviceWorker && 'skipWaiting' in serviceWorker

if (isServiceWorkerRuntime) {
  void initializeServiceWorker()
}

async function initializeServiceWorker(): Promise<void> {
  const { cleanupOutdatedCaches, precacheAndRoute } = await import('workbox-precaching')
  precacheAndRoute(self.__WB_MANIFEST)
  cleanupOutdatedCaches()

  serviceWorker.addEventListener('activate', (event) => {
    event.waitUntil(serviceWorker.clients.claim())
  })

  serviceWorker.addEventListener('message', (event) => {
    if (isSkipWaitingMessage(event.data)) {
      event.waitUntil(serviceWorker.skipWaiting())
    }
  })

  serviceWorker.addEventListener('fetch', (event) => {
    if (isCacheableApiRequest(event.request)) {
      event.respondWith(handleApiRequest(event.request))
    } else if (isTiantianFundSnapshotRequest(event.request)) {
      event.respondWith(handleTiantianFundSnapshotRequest(event.request))
    }
  })
}

function isSkipWaitingMessage(data: unknown): data is { type: 'SKIP_WAITING' } {
  return typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING'
}

export function isCacheableApiRequest(request: Request): boolean {
  if (request.method !== 'GET') {
    return false
  }

  const url = new URL(request.url)
  return isTiantianMmUrl(url)
}

export function isTiantianFundSnapshotRequest(request: Request): boolean {
  if (request.method !== 'POST') {
    return false
  }

  const url = new URL(request.url)
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  return (
    url.origin === 'https://fundcomapi.tiantianfunds.com' &&
    url.pathname === '/mm/FundFavor/FundFavorInfo' &&
    contentType === 'application/x-www-form-urlencoded'
  )
}

export async function createTiantianFundSnapshotCacheKey(request: Request): Promise<Request> {
  const body = normalizeFormBody(await request.clone().text())
  const params = new URLSearchParams(body)
  const keyUrl = new URL('https://pure-hold.invalid/tiantian-fund-snapshot')
  keyUrl.searchParams.set('endpoint', request.url)
  keyUrl.searchParams.set('deviceid', params.get('deviceid') ?? '')
  keyUrl.searchParams.set('body', body)
  return new Request(keyUrl)
}

export async function handleTiantianFundSnapshotRequest(request: Request): Promise<Response> {
  const cacheKey = await createTiantianFundSnapshotCacheKey(request)
  const cache = await caches.open(snapshotCacheName)
  const metadataCache = await caches.open(snapshotMetadataCacheName)
  const cachedResponse = await cache.match(cacheKey)
  const cachedAt = await readCachedAt(metadataCache, cacheKey)
  const cacheAge = cachedAt === undefined ? undefined : Math.max(0, Date.now() - cachedAt)
  const bypassFreshCache = request.cache === 'no-store'

  if (!bypassFreshCache && cachedResponse && cacheAge !== undefined && cacheAge <= freshDuration) {
    return createSnapshotResponse(cachedResponse, 'cache', cachedAt)
  }

  if (cachedResponse && (cacheAge === undefined || cacheAge > maximumRetention)) {
    await deleteCachedResponse(cache, metadataCache, cacheKey)
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.status !== 200) {
      return networkResponse
    }

    const networkAt = Date.now()
    await storeApiResponse(
      cache,
      metadataCache,
      cacheKey,
      networkResponse.clone(),
      networkAt,
    ).catch(() => undefined)
    return createSnapshotResponse(networkResponse, 'network', networkAt)
  } catch (error) {
    if (cachedResponse && cacheAge !== undefined && cacheAge <= maximumRetention) {
      return createSnapshotResponse(cachedResponse, 'cache-fallback', cachedAt, true)
    }

    await deleteCachedResponse(cache, metadataCache, cacheKey)
    throw error
  }
}

async function handleApiRequest(request: Request): Promise<Response> {
  const cache = await caches.open(apiCacheName)
  const metadataCache = await caches.open(apiMetadataCacheName)
  const cachedResponse = await cache.match(request)
  const cachedAt = await readCachedAt(metadataCache, request)
  const cacheAge = cachedAt === undefined ? undefined : Math.max(0, Date.now() - cachedAt)

  if (
    request.cache !== 'no-store' &&
    cachedResponse &&
    cacheAge !== undefined &&
    cacheAge <= freshDuration
  ) {
    return cachedResponse
  }

  if (cachedResponse && (cacheAge === undefined || cacheAge > maximumRetention)) {
    await deleteCachedResponse(cache, metadataCache, request)
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.status === 200) {
      await storeApiResponse(
        cache,
        metadataCache,
        request,
        networkResponse.clone(),
        Date.now(),
      ).catch(() => undefined)
    }
    return networkResponse
  } catch (error) {
    if (cachedResponse && cacheAge !== undefined && cacheAge <= maximumRetention) {
      return cachedResponse
    }

    await deleteCachedResponse(cache, metadataCache, request)
    throw error
  }
}

function isTiantianMmUrl(url: URL): boolean {
  return (
    url.origin === 'https://fundcomapi.tiantianfunds.com' &&
    (url.pathname === '/mm' || url.pathname.startsWith('/mm/'))
  )
}

function normalizeFormBody(body: string): string {
  const entries = [...new URLSearchParams(body).entries()]
  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    return leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  })
  return new URLSearchParams(entries).toString()
}

function createSnapshotResponse(
  response: Response,
  source: 'network' | 'cache' | 'cache-fallback',
  cachedAt: number | undefined,
  isFallback = false,
): Response {
  const headers = new Headers(response.headers)
  headers.set(snapshotDataSourceHeader, source)
  if (cachedAt === undefined) {
    headers.delete(snapshotCachedAtHeader)
  } else {
    headers.set(snapshotCachedAtHeader, String(cachedAt))
  }
  if (isFallback) {
    headers.set(snapshotCacheFallbackHeader, 'true')
  } else {
    headers.delete(snapshotCacheFallbackHeader)
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

async function readCachedAt(cache: Cache, request: Request): Promise<number | undefined> {
  const response = await cache.match(request)
  if (!response) {
    return undefined
  }

  const cachedAt = Number(await response.text())
  return Number.isFinite(cachedAt) ? cachedAt : undefined
}

async function storeApiResponse(
  cache: Cache,
  metadataCache: Cache,
  request: Request,
  response: Response,
  cachedAt: number,
): Promise<void> {
  await Promise.all([
    cache.put(request, response),
    metadataCache.put(request, new Response(String(cachedAt))),
  ])
  await pruneApiCache(cache, metadataCache, cachedAt)
}

async function pruneApiCache(cache: Cache, metadataCache: Cache, now: number): Promise<void> {
  const requests = await cache.keys()
  const entries = await Promise.all(
    requests.map(async (request) => ({
      cachedAt: await readCachedAt(metadataCache, request),
      request,
    })),
  )

  const validEntries = entries.filter(
    (entry): entry is { cachedAt: number; request: Request } =>
      entry.cachedAt !== undefined && now - entry.cachedAt <= maximumRetention,
  )
  const retainedUrls = new Set(
    validEntries
      .sort((left, right) => right.cachedAt - left.cachedAt)
      .slice(0, maximumEntries)
      .map((entry) => entry.request.url),
  )

  await Promise.all(
    entries
      .filter((entry) => !retainedUrls.has(entry.request.url))
      .flatMap((entry) => [cache.delete(entry.request), metadataCache.delete(entry.request)]),
  )
}

async function deleteCachedResponse(
  cache: Cache,
  metadataCache: Cache,
  request: Request,
): Promise<void> {
  await Promise.all([cache.delete(request), metadataCache.delete(request)]).catch(() => undefined)
}
