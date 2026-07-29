import type {
  FundCumulativeReturns,
  FundPerformanceRange,
} from '../../models/fundCumulativeReturns.ts'
import { createEastmoneyFundCumulativeReturnsRequestUrl } from './createEastmoneyFundCumulativeReturnsRequestUrl.ts'
import { parseEastmoneyFundCumulativeReturnsResponse } from './parseEastmoneyFundCumulativeReturnsResponse.ts'

export async function fetchEastmoneyFundCumulativeReturns(
  fundCode: string,
  referenceIndexCode: string,
  range: FundPerformanceRange,
  signal?: AbortSignal,
): Promise<FundCumulativeReturns> {
  const response = await fetch(
    createEastmoneyFundCumulativeReturnsRequestUrl(fundCode, referenceIndexCode, range),
    { signal },
  )
  if (!response.ok) {
    throw new Error('累计收益服务暂时不可用')
  }
  return parseEastmoneyFundCumulativeReturnsResponse(
    await response.json(),
    fundCode,
    referenceIndexCode,
    range,
  )
}
