import type { FundHistoryRange } from '../../models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '../../models/fundNetValueHistory.ts'
import { createTiantianFundNetValueHistoryRequestUrl } from './createTiantianFundNetValueHistoryRequestUrl.ts'
import { parseTiantianFundNetValueHistoryResponse } from './parseTiantianFundNetValueHistoryResponse.ts'

export async function fetchTiantianFundNetValueHistory(
  fundCode: string,
  range: FundHistoryRange,
  signal?: AbortSignal,
): Promise<FundNetValueHistory> {
  const response = await fetch(createTiantianFundNetValueHistoryRequestUrl(fundCode, range), {
    signal,
  })
  if (!response.ok) {
    throw new Error('基金净值历史服务暂时不可用')
  }
  return parseTiantianFundNetValueHistoryResponse(await response.json(), fundCode, range)
}
