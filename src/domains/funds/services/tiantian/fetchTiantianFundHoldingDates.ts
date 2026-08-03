import { createTiantianFundHoldingDatesRequestUrl } from './createTiantianFundHoldingDatesRequestUrl.ts'
import { parseTiantianFundHoldingDatesResponse } from './parseTiantianFundHoldingDatesResponse.ts'

export async function fetchTiantianFundHoldingDates(
  fundCode: string,
  signal?: AbortSignal,
): Promise<readonly string[]> {
  const response = await fetch(createTiantianFundHoldingDatesRequestUrl(fundCode), { signal })
  if (!response.ok) {
    throw new Error(`Tiantian fund holding dates request failed with HTTP ${response.status}`)
  }
  return parseTiantianFundHoldingDatesResponse(await response.json())
}
