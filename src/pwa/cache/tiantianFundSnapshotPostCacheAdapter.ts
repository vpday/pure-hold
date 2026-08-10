import {
  cacheResponseCachedAtHeader,
  cacheResponseFallbackHeader,
  cacheResponseSourceHeader,
} from '@/shared/transport/cacheResponseMetadata.ts'
import { createCachePolicyHandler, type CacheResponseContext } from './cachePolicy.ts'

export const tiantianFundSnapshotEndpoint =
  'https://fundcomapi.tiantianfunds.com/mm/FundFavor/FundFavorInfo'

const tiantianFundSnapshotPostCacheAdapter = {
  createCacheKey: createTiantianFundSnapshotCacheKey,
  decorateResponse: createSnapshotResponse,
  matches: matchesTiantianFundSnapshotPostRequest,
  metadataCacheName: 'pure-hold-fund-snapshot-metadata-v1',
  responseCacheName: 'pure-hold-fund-snapshot-v1',
}

export const handleTiantianFundSnapshotPostRequest = createCachePolicyHandler(
  tiantianFundSnapshotPostCacheAdapter,
)

export function matchesTiantianFundSnapshotPostRequest(request: Request): boolean {
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

function normalizeFormBody(body: string): string {
  const entries = [...new URLSearchParams(body).entries()]
  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    return leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  })
  return new URLSearchParams(entries).toString()
}

function createSnapshotResponse(response: Response, context: CacheResponseContext): Response {
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
