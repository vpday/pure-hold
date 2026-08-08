import type { FundSnapshot } from '../../models/fundSnapshot.ts'
import { createTiantianFundRequestBody } from './createTiantianFundRequestBody.ts'
import type { FundRefreshIssue } from './fundRefreshIssue.ts'
import { parseTiantianFundResponse } from './parseTiantianFundResponse.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/FundFavor/FundFavorInfo'
const batchSize = 50
const dataSourceHeader = 'X-Pure-Hold-Data-Source'
const cachedAtHeader = 'X-Pure-Hold-Cached-At'
const cacheFallbackHeader = 'X-Pure-Hold-Cache-Fallback'

export type FundRefreshSource = 'network' | 'cache' | 'cache-fallback' | 'mixed'

export interface FundRefreshBatch {
  readonly fetchedAt: number
  readonly issues: readonly FundRefreshIssue[]
  readonly source: FundRefreshSource
  readonly snapshots: readonly FundSnapshot[]
}

export async function fetchTiantianFundSnapshots(
  fundCodes: readonly string[],
  signal?: AbortSignal,
  options?: { readonly force?: boolean },
): Promise<FundRefreshBatch> {
  const issues: FundRefreshIssue[] = []
  const snapshots: FundSnapshot[] = []
  const successfulTimes: number[] = []
  const sources: Array<Exclude<FundRefreshSource, 'mixed'>> = []

  for (let index = 0; index < fundCodes.length; index += batchSize) {
    const codes = fundCodes.slice(index, index + batchSize)
    try {
      const response = await fetch(endpoint, {
        body: createTiantianFundRequestBody(codes),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        cache: options?.force ? 'no-store' : 'default',
        signal,
      })
      if (!response.ok) {
        throw new Error(`Tiantian request failed with HTTP ${response.status}`)
      }
      const metadata = readResponseMetadata(response)
      successfulTimes.push(metadata.fetchedAt)
      sources.push(metadata.source)
      if (metadata.source === 'cache-fallback') {
        issues.push(...codes.map((fundCode) => ({ code: 'cache-fallback' as const, fundCode })))
      }
      const parsed = parseTiantianFundResponse(await response.json(), codes, metadata.fetchedAt)
      issues.push(...parsed.issues)
      snapshots.push(...parsed.snapshots)
    } catch (error) {
      if (signal?.aborted) {
        throw error
      }
      issues.push(...codes.map((fundCode) => ({ code: 'request-failed' as const, fundCode })))
    }
  }

  return {
    fetchedAt: successfulTimes.length > 0 ? Math.max(...successfulTimes) : Date.now(),
    issues,
    source: combineSources(sources),
    snapshots,
  }
}

function readResponseMetadata(response: Response): {
  readonly fetchedAt: number
  readonly source: Exclude<FundRefreshSource, 'mixed'>
} {
  const source = response.headers.get(dataSourceHeader)
  const cachedAt = Number(response.headers.get(cachedAtHeader))
  const fetchedAt = Number.isFinite(cachedAt) ? cachedAt : Date.now()
  if (source === 'cache' || source === 'cache-fallback') {
    return { fetchedAt, source }
  }
  if (response.headers.get(cacheFallbackHeader) === 'true') {
    return { fetchedAt, source: 'cache-fallback' }
  }
  return { fetchedAt, source: 'network' }
}

function combineSources(
  sources: readonly Exclude<FundRefreshSource, 'mixed'>[],
): FundRefreshSource {
  const uniqueSources = [...new Set(sources)]
  return uniqueSources.length === 0
    ? 'network'
    : uniqueSources.length === 1
      ? uniqueSources[0]!
      : 'mixed'
}
