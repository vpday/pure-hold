import type { FundSnapshot } from '../../models/fundSnapshot.ts'
import type { FundRefreshIssue } from './fundRefreshIssue.ts'
import { mapTiantianFundSnapshot } from './mapTiantianFundSnapshot.ts'
import type { TiantianFundDto, TiantianFundResponse } from './tiantianFundDto.ts'

export interface ParsedTiantianFundResponse {
  readonly issues: readonly FundRefreshIssue[]
  readonly snapshots: readonly FundSnapshot[]
}

export function parseTiantianFundResponse(
  value: unknown,
  requestedCodes: readonly string[],
  fetchedAt: number,
): ParsedTiantianFundResponse {
  if (!isSuccessfulResponse(value)) {
    return {
      issues: requestedCodes.map((fundCode) => ({
        code: 'business-response-failed',
        fundCode,
      })),
      snapshots: [],
    }
  }

  const requested = new Set(requestedCodes)
  const returned = new Set<string>()
  const issues: FundRefreshIssue[] = []
  const snapshots: FundSnapshot[] = []

  for (const record of value.data) {
    if (!isRecord(record)) {
      issues.push({ code: 'malformed-record' })
      continue
    }
    const snapshot = mapTiantianFundSnapshot(record as TiantianFundDto, fetchedAt)
    if (!snapshot) {
      issues.push({
        code: 'malformed-record',
        fundCode: typeof record.FCODE === 'string' ? record.FCODE : undefined,
      })
      continue
    }
    if (!requested.has(snapshot.code)) {
      issues.push({ code: 'unexpected-record', fundCode: snapshot.code })
      continue
    }
    if (returned.has(snapshot.code)) {
      issues.push({ code: 'malformed-record', fundCode: snapshot.code })
      continue
    }
    returned.add(snapshot.code)
    snapshots.push(snapshot)
  }

  for (const fundCode of requestedCodes) {
    if (!returned.has(fundCode)) {
      issues.push({ code: 'missing-record', fundCode })
    }
  }

  const order = new Map(requestedCodes.map((code, index) => [code, index]))
  snapshots.sort((left, right) => (order.get(left.code) ?? 0) - (order.get(right.code) ?? 0))
  return { issues, snapshots }
}

function isSuccessfulResponse(value: unknown): value is TiantianFundResponse & {
  readonly data: readonly unknown[]
  readonly errorCode: 0
  readonly success: true
  readonly totalCount: number
} {
  return (
    isRecord(value) &&
    value.success === true &&
    value.errorCode === 0 &&
    Array.isArray(value.data) &&
    typeof value.totalCount === 'number' &&
    Number.isFinite(value.totalCount) &&
    value.totalCount >= 0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
