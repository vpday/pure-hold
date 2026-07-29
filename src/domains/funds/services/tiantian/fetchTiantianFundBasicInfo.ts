import type { FundBasicInfo } from '../../models/fundBasicInfo.ts'
import { createTiantianFundBasicInfoRequestBody } from './createTiantianFundBasicInfoRequestBody.ts'
import { parseTiantianFundBasicInfoResponse } from './parseTiantianFundBasicInfoResponse.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundBaseInfos'

export async function fetchTiantianFundBasicInfo(
  fundCode: string,
  signal?: AbortSignal,
): Promise<FundBasicInfo> {
  const response = await fetch(endpoint, {
    body: createTiantianFundBasicInfoRequestBody(fundCode),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    signal,
  })
  if (!response.ok) {
    throw new Error(`Tiantian fund basic info request failed with HTTP ${response.status}`)
  }
  return parseTiantianFundBasicInfoResponse(await response.json(), fundCode)
}
