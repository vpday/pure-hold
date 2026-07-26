import type { FundSnapshot } from '../../models/fundSnapshot.ts'
import { createTiantianFundRequestBody } from './createTiantianFundRequestBody.ts'
import type { FundRefreshIssue } from './fundRefreshIssue.ts'
import { parseTiantianFundResponse } from './parseTiantianFundResponse.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/FundFavor/FundFavorInfo'
const batchSize = 50

export interface FundRefreshBatch {
  readonly fetchedAt: number
  readonly issues: readonly FundRefreshIssue[]
  readonly snapshots: readonly FundSnapshot[]
}

export async function fetchTiantianFundSnapshots(
  fundCodes: readonly string[],
  signal?: AbortSignal,
): Promise<FundRefreshBatch> {
  const fetchedAt = Date.now()
  const issues: FundRefreshIssue[] = []
  const snapshots: FundSnapshot[] = []

  for (let index = 0; index < fundCodes.length; index += batchSize) {
    const codes = fundCodes.slice(index, index + batchSize)
    try {
      const response = await fetch(endpoint, {
        body: createTiantianFundRequestBody(codes),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        signal,
      })
      if (!response.ok) {
        throw new Error(`Tiantian request failed with HTTP ${response.status}`)
      }
      const parsed = parseTiantianFundResponse(await response.json(), codes, fetchedAt)
      issues.push(...parsed.issues)
      snapshots.push(...parsed.snapshots)
    } catch (error) {
      if (signal?.aborted) {
        throw error
      }
      issues.push(...codes.map((fundCode) => ({ code: 'request-failed' as const, fundCode })))
    }
  }

  return { fetchedAt, issues, snapshots }
}
