import type { FundCumulativeReturns } from '../../models/fundCumulativeReturns.ts'
import type { FundHistoryRange } from '../../models/fundHistoryRange.ts'
import { createTiantianFundCumulativeReturnsRequestUrl } from './createTiantianFundCumulativeReturnsRequestUrl.ts'
import { parseTiantianFundCumulativeReturnsResponse } from './parseTiantianFundCumulativeReturnsResponse.ts'

export async function fetchTiantianFundCumulativeReturns(
  fundCode: string,
  referenceIndexCode: string,
  range: FundHistoryRange,
  signal?: AbortSignal,
): Promise<FundCumulativeReturns> {
  const response = await fetch(
    createTiantianFundCumulativeReturnsRequestUrl(fundCode, referenceIndexCode, range),
    { signal },
  )
  if (!response.ok) {
    throw new Error('累计收益服务暂时不可用')
  }
  return parseTiantianFundCumulativeReturnsResponse(
    await response.json(),
    fundCode,
    referenceIndexCode,
    range,
  )
}
