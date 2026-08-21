import type { FundMarketData } from '../models/fundMarketData.ts'
import type { FundRefreshIssue } from '../services/tiantian/fundRefreshIssue.ts'
import type { FundRefreshBatch } from '../services/tiantian/fetchTiantianFundMarketData.ts'

export interface MergedFundRefreshResult {
  readonly issues: readonly FundRefreshIssue[]
  readonly marketDataByCode: Readonly<Record<string, FundMarketData>>
  readonly updatedCount: number
}

export function mergeFundRefreshResult(
  currentMarketDataByCode: Readonly<Record<string, FundMarketData>>,
  currentFundOrder: readonly string[],
  requestedCodes: readonly string[],
  batch: FundRefreshBatch,
): MergedFundRefreshResult {
  const currentCodes = new Set(currentFundOrder)
  const requested = new Set(requestedCodes)
  const marketDataByCode = { ...currentMarketDataByCode }
  const issues = [...batch.issues]
  let updatedCount = 0

  for (const incomingMarketData of batch.marketData) {
    if (!requested.has(incomingMarketData.code) || !currentCodes.has(incomingMarketData.code)) {
      issues.push({ code: 'unexpected-record', fundCode: incomingMarketData.code })
      continue
    }
    const currentMarketData = marketDataByCode[incomingMarketData.code]
    if (
      currentMarketData &&
      isConfirmedMarketDataRegression(currentMarketData, incomingMarketData)
    ) {
      continue
    }
    marketDataByCode[incomingMarketData.code] = incomingMarketData
    updatedCount += 1
  }

  for (const code of Object.keys(marketDataByCode)) {
    if (!currentCodes.has(code)) {
      delete marketDataByCode[code]
    }
  }

  return { issues, marketDataByCode, updatedCount }
}

function isConfirmedMarketDataRegression(
  current: FundMarketData,
  incoming: FundMarketData,
): boolean {
  if (!current.navDate || current.nav === null) return false
  if (!incoming.navDate || incoming.nav === null) return true
  return incoming.navDate < current.navDate
}
