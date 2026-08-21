import {
  cacheResponseCachedAtHeader,
  cacheResponseFallbackHeader,
  cacheResponseSourceHeader,
} from '@/shared/transport/cacheResponseMetadata.ts'
import { createCachePolicyHandler, type CacheResponseContext } from './cachePolicy.ts'
import type { CacheRoute } from './cacheRouteRegistry.ts'

export const tiantianFundMarketDataEndpoint =
  'https://fundcomapi.tiantianfunds.com/mm/FundFavor/FundFavorInfo'

const tiantianFundMarketDataPostCacheAdapter = {
  createCacheKey: createTiantianFundMarketDataCacheKey,
  decorateResponse: decorateMarketDataResponse,
  metadataCacheName: 'pure-hold-fund-snapshot-metadata-v1',
  responseCacheName: 'pure-hold-fund-snapshot-v1',
}

export const handleTiantianFundMarketDataPostRequest = createCachePolicyHandler(
  tiantianFundMarketDataPostCacheAdapter,
)

export const tiantianFundMarketDataPostCacheRoute: CacheRoute = {
  handle: handleTiantianFundMarketDataPostRequest,
  id: 'tiantian-fund-market-data-post',
  matches: matchesTiantianFundMarketDataPostRequest,
}

export function matchesTiantianFundMarketDataPostRequest(request: Request): boolean {
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

export async function createTiantianFundMarketDataCacheKey(request: Request): Promise<Request> {
  const body = normalizeFormBody(await request.clone().text())
  const params = new URLSearchParams(body)
  const keyUrl = new URL('https://pure-hold.invalid/tiantian-fund-snapshot')
  keyUrl.searchParams.set('endpoint', request.url)
  keyUrl.searchParams.set('deviceid', params.get('deviceid') ?? '')
  keyUrl.searchParams.set('body', body)
  return new Request(keyUrl)
}

function normalizeFormBody(body: string): string {
  const entries = [...new URLSearchParams(body).entries()]
  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    return leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  })
  return new URLSearchParams(entries).toString()
}

function decorateMarketDataResponse(response: Response, context: CacheResponseContext): Response {
  const headers = new Headers(response.headers)
  headers.set(cacheResponseSourceHeader, context.source)
  if (context.cachedAt === undefined) {
    headers.delete(cacheResponseCachedAtHeader)
  } else {
    headers.set(cacheResponseCachedAtHeader, String(context.cachedAt))
  }
  if (context.isFallback) {
    headers.set(cacheResponseFallbackHeader, 'true')
  } else {
    headers.delete(cacheResponseFallbackHeader)
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}
