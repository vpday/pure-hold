import type { FundMarketData } from '../../models/fundMarketData.ts'
import type { FundRefreshIssue } from './fundRefreshIssue.ts'
import { mapTiantianFundMarketData } from './mapTiantianFundMarketData.ts'
import type { TiantianFundDto } from './tiantianFundDto.ts'
import { isSuccessfulTiantianResponse } from './tiantianResponse.ts'

export interface ParsedTiantianFundResponse {
  readonly issues: readonly FundRefreshIssue[]
  readonly marketData: readonly FundMarketData[]
}

export function parseTiantianFundResponse(
  value: unknown,
  requestedCodes: readonly string[],
  fetchedAt: number,
): ParsedTiantianFundResponse {
  if (
    !isSuccessfulTiantianResponse(value) ||
    !Array.isArray(value.data) ||
    typeof value.totalCount !== 'number' ||
    !Number.isFinite(value.totalCount) ||
    value.totalCount < 0
  ) {
    return {
      issues: requestedCodes.map((fundCode) => ({
        code: 'business-response-failed',
        fundCode,
      })),
      marketData: [],
    }
  }

  const requested = new Set(requestedCodes)
  const returned = new Set<string>()
  const issues: FundRefreshIssue[] = []
  const marketData: FundMarketData[] = []

  for (const record of value.data) {
    if (!isRecord(record)) {
      issues.push({ code: 'malformed-record' })
      continue
    }
    const incomingMarketData = mapTiantianFundMarketData(record as TiantianFundDto, fetchedAt)
    if (!incomingMarketData) {
      issues.push({
        code: 'malformed-record',
        fundCode: typeof record.FCODE === 'string' ? record.FCODE : undefined,
      })
      continue
    }
    if (!requested.has(incomingMarketData.code)) {
      issues.push({ code: 'unexpected-record', fundCode: incomingMarketData.code })
      continue
    }
    if (returned.has(incomingMarketData.code)) {
      issues.push({ code: 'malformed-record', fundCode: incomingMarketData.code })
      continue
    }
    returned.add(incomingMarketData.code)
    marketData.push(incomingMarketData)
  }

  for (const fundCode of requestedCodes) {
    if (!returned.has(fundCode)) {
      issues.push({ code: 'missing-record', fundCode })
    }
  }

  const order = new Map(requestedCodes.map((code, index) => [code, index]))
  marketData.sort((left, right) => (order.get(left.code) ?? 0) - (order.get(right.code) ?? 0))
  return { issues, marketData }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
