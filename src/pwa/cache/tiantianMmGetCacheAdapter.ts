import { createCachePolicyHandler } from './cachePolicy.ts'

const tiantianMmGetCacheAdapter = {
  createCacheKey: (request: Request) => request,
  matches: matchesTiantianMmGetRequest,
  metadataCacheName: 'pure-hold-api-metadata-v1',
  responseCacheName: 'pure-hold-api-v1',
}

export const handleTiantianMmGetRequest = createCachePolicyHandler(tiantianMmGetCacheAdapter)

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
