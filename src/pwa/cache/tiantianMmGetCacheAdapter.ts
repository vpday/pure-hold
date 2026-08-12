import { createCachePolicyHandler } from './cachePolicy.ts'
import type { CacheRoute } from './cacheRouteRegistry.ts'

const tiantianMmGetCacheAdapter = {
  createCacheKey: (request: Request) => request,
  metadataCacheName: 'pure-hold-api-metadata-v1',
  responseCacheName: 'pure-hold-api-v1',
}

export const handleTiantianMmGetRequest = createCachePolicyHandler(tiantianMmGetCacheAdapter)

export const tiantianMmGetCacheRoute: CacheRoute = {
  handle: handleTiantianMmGetRequest,
  id: 'tiantian-mm-get',
  matches: matchesTiantianMmGetRequest,
}

export function matchesTiantianMmGetRequest(request: Request): boolean {
  if (request.method !== 'GET') {
    return false
  }

  const url = new URL(request.url)
  return (
    url.origin === 'https://fundcomapi.tiantianfunds.com' &&
    (url.pathname === '/mm' || url.pathname.startsWith('/mm/'))
  )
}
