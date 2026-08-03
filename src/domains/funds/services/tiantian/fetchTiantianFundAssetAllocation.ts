import type { FundAssetAllocation } from '../../models/fundAssetAllocation.ts'
import { createTiantianFundAssetAllocationRequestUrl } from './createTiantianFundAssetAllocationRequestUrl.ts'
import { parseTiantianFundAssetAllocationResponse } from './parseTiantianFundAssetAllocationResponse.ts'

export async function fetchTiantianFundAssetAllocation(
  fundCode: string,
  signal?: AbortSignal,
): Promise<FundAssetAllocation> {
  const response = await fetch(createTiantianFundAssetAllocationRequestUrl(fundCode), { signal })
  if (!response.ok) {
    throw new Error(`资产配置服务请求失败 (${response.status})`)
  }
  return parseTiantianFundAssetAllocationResponse(await response.json(), fundCode)
}
