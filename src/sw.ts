import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

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

const serviceWorker = globalThis as ServiceWorkerScope
const apiCacheName = 'pure-hold-api-v1'
const apiMetadataCacheName = 'pure-hold-api-metadata-v1'
const freshDuration = 10 * 60 * 1000
const maximumRetention = 24 * 60 * 60 * 1000
const maximumEntries = 100

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
  }
})

function isSkipWaitingMessage(data: unknown): data is { type: 'SKIP_WAITING' } {
  return typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING'
}

function isCacheableApiRequest(request: Request): boolean {
  if (request.method !== 'GET') {
    return false
  }

  const url = new URL(request.url)
  return (
    url.origin === 'https://fundcomapi.tiantianfunds.com' &&
    (url.pathname === '/mm' || url.pathname.startsWith('/mm/'))
  )
}

async function handleApiRequest(request: Request): Promise<Response> {
  const cache = await caches.open(apiCacheName)
  const metadataCache = await caches.open(apiMetadataCacheName)
  const cachedResponse = await cache.match(request)
  const cachedAt = await readCachedAt(metadataCache, request)
  const cacheAge = cachedAt === undefined ? undefined : Math.max(0, Date.now() - cachedAt)

  if (cachedResponse && cacheAge !== undefined && cacheAge <= freshDuration) {
    return cachedResponse
  }

  if (cachedResponse && (cacheAge === undefined || cacheAge > maximumRetention)) {
    await Promise.all([cache.delete(request), metadataCache.delete(request)]).catch(() => undefined)
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.status === 200) {
      await storeApiResponse(cache, metadataCache, request, networkResponse.clone()).catch(
        () => undefined,
      )
    }
    return networkResponse
  } catch (error) {
    if (cachedResponse && cacheAge !== undefined && cacheAge <= maximumRetention) {
      return cachedResponse
    }

    await Promise.all([cache.delete(request), metadataCache.delete(request)]).catch(() => undefined)
    throw error
  }
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
): Promise<void> {
  const cachedAt = Date.now()
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
