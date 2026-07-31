import type { FundDistributionHistory } from '../../models/fundDistributionHistory.ts'
import { createTiantianFundDistributionRequestUrl } from './createTiantianFundDistributionRequestUrl.ts'
import { parseTiantianFundDistributionResponse } from './parseTiantianFundDistributionResponse.ts'

export async function fetchTiantianFundDistribution(
  fundCode: string,
  signal?: AbortSignal,
): Promise<FundDistributionHistory> {
  const response = await fetch(createTiantianFundDistributionRequestUrl(fundCode), { signal })
  if (!response.ok) {
    throw new Error('基金分红送配服务暂时不可用')
  }
  return parseTiantianFundDistributionResponse(await response.json(), fundCode)
}
