import type { TransportResponseSource } from '@/shared/transport/cacheResponseMetadata.ts'

const freshDuration = 10 * 60 * 1000
const maximumRetention = 24 * 60 * 60 * 1000
const maximumEntries = 100

export interface CacheResponseContext {
  readonly cachedAt: number | undefined
  readonly isFallback: boolean
  readonly source: TransportResponseSource
}

export interface CachePolicyAdapter {
  readonly createCacheKey: (request: Request) => Promise<Request> | Request
  readonly decorateResponse?: (response: Response, context: CacheResponseContext) => Response
  readonly metadataCacheName: string
  readonly responseCacheName: string
}

export function createCachePolicyHandler(
  adapter: CachePolicyAdapter,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const cacheKey = await adapter.createCacheKey(request)
    const responseCache = await globalThis.caches.open(adapter.responseCacheName)
    const metadataCache = await globalThis.caches.open(adapter.metadataCacheName)
    const cachedResponse = await responseCache.match(cacheKey)
    const cachedAt = await readCachedAt(metadataCache, cacheKey)
    const cacheAge = cachedAt === undefined ? undefined : Math.max(0, Date.now() - cachedAt)

    if (
      request.cache !== 'no-store' &&
      cachedResponse &&
      cacheAge !== undefined &&
      cacheAge <= freshDuration
    ) {
      return decorateResponse(adapter, cachedResponse, {
        cachedAt,
        isFallback: false,
        source: 'cache',
      })
    }

    if (cachedResponse && (cacheAge === undefined || cacheAge > maximumRetention)) {
      await deleteCachedResponse(responseCache, metadataCache, cacheKey)
    }

    try {
      const networkResponse = await globalThis.fetch(request)
      if (networkResponse.status !== 200) {
        return networkResponse
      }

      const networkAt = Date.now()
      await storeResponse(
        responseCache,
        metadataCache,
        cacheKey,
        networkResponse.clone(),
        networkAt,
      ).catch(() => undefined)
      return decorateResponse(adapter, networkResponse, {
        cachedAt: networkAt,
        isFallback: false,
        source: 'network',
      })
    } catch (error) {
      if (cachedResponse && cacheAge !== undefined && cacheAge <= maximumRetention) {
        return decorateResponse(adapter, cachedResponse, {
          cachedAt,
          isFallback: true,
          source: 'cache-fallback',
        })
      }

      await deleteCachedResponse(responseCache, metadataCache, cacheKey)
      throw error
    }
  }
}

function decorateResponse(
  adapter: CachePolicyAdapter,
  response: Response,
  context: CacheResponseContext,
): Response {
  return adapter.decorateResponse?.(response, context) ?? response
}

async function readCachedAt(cache: Cache, request: Request): Promise<number | undefined> {
  const response = await cache.match(request)
  if (!response) {
    return undefined
  }

  const cachedAt = Number(await response.text())
  return Number.isFinite(cachedAt) ? cachedAt : undefined
}

async function storeResponse(
  responseCache: Cache,
  metadataCache: Cache,
  request: Request,
  response: Response,
  cachedAt: number,
): Promise<void> {
  await Promise.all([
    responseCache.put(request, response),
    metadataCache.put(request, new Response(String(cachedAt))),
  ])
  await pruneCache(responseCache, metadataCache, cachedAt)
}

async function pruneCache(responseCache: Cache, metadataCache: Cache, now: number): Promise<void> {
  const requests = await responseCache.keys()
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
      .flatMap((entry) => [
        responseCache.delete(entry.request),
        metadataCache.delete(entry.request),
      ]),
  )
}

async function deleteCachedResponse(
  responseCache: Cache,
  metadataCache: Cache,
  request: Request,
): Promise<void> {
  await Promise.all([responseCache.delete(request), metadataCache.delete(request)]).catch(
    () => undefined,
  )
}
