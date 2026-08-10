export const cacheResponseSourceHeader = 'X-Pure-Hold-Data-Source'
export const cacheResponseCachedAtHeader = 'X-Pure-Hold-Cached-At'
export const cacheResponseFallbackHeader = 'X-Pure-Hold-Cache-Fallback'

export type TransportResponseSource = 'network' | 'cache' | 'cache-fallback'

export interface CacheResponseMetadata {
  readonly fetchedAt: number
  readonly source: TransportResponseSource
}

export function readCacheResponseMetadata(response: Response): CacheResponseMetadata {
  const source = response.headers.get(cacheResponseSourceHeader)
  const cachedAtHeader = response.headers.get(cacheResponseCachedAtHeader)
  const cachedAt = cachedAtHeader === null ? Number.NaN : Number(cachedAtHeader)
  const fetchedAt = Number.isFinite(cachedAt) ? cachedAt : Date.now()

  if (source === 'cache' || source === 'cache-fallback') {
    return { fetchedAt, source }
  }
  if (response.headers.get(cacheResponseFallbackHeader) === 'true') {
    return { fetchedAt, source: 'cache-fallback' }
  }
  return { fetchedAt, source: 'network' }
}
