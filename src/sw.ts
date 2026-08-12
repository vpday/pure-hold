import {
  createCacheRouteRegistry,
  type CacheRouteRegistry,
} from '@/pwa/cache/cacheRouteRegistry.ts'
import { tiantianFundSnapshotPostCacheRoute } from '@/pwa/cache/tiantianFundSnapshotPostCacheAdapter.ts'
import { tiantianMmGetCacheRoute } from '@/pwa/cache/tiantianMmGetCacheAdapter.ts'

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
const isServiceWorkerRuntime =
  typeof self !== 'undefined' && 'clients' in serviceWorker && 'skipWaiting' in serviceWorker
const cacheRouteRegistry = createCacheRouteRegistry([
  tiantianMmGetCacheRoute,
  tiantianFundSnapshotPostCacheRoute,
])

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
    handleCacheFetchEvent(event)
  })
}

export function handleCacheFetchEvent(
  event: Pick<FetchEventLike, 'request' | 'respondWith'>,
  registry: CacheRouteRegistry = cacheRouteRegistry,
): void {
  const resolution = registry.resolve(event.request)
  if (resolution.handled) {
    event.respondWith(resolution.route.handle(event.request))
  }
}

function isSkipWaitingMessage(data: unknown): data is { type: 'SKIP_WAITING' } {
  return typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING'
}
