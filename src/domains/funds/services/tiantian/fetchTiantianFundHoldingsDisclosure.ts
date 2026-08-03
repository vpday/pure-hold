import type { FundHoldingsDisclosure } from '../../models/fundHoldingsDisclosure.ts'
import { createTiantianFundHoldingsDisclosureRequestUrl } from './createTiantianFundHoldingsDisclosureRequestUrl.ts'
import { parseTiantianFundHoldingsDisclosureResponse } from './parseTiantianFundHoldingsDisclosureResponse.ts'

export async function fetchTiantianFundHoldingsDisclosure(
  fundCode: string,
  reportDate: string,
  signal?: AbortSignal,
): Promise<FundHoldingsDisclosure> {
  const response = await fetch(
    createTiantianFundHoldingsDisclosureRequestUrl(fundCode, reportDate),
    {
      signal,
    },
  )
  if (!response.ok) {
    throw new Error(`Tiantian fund holdings request failed with HTTP ${response.status}`)
  }
  return parseTiantianFundHoldingsDisclosureResponse(await response.json(), fundCode, reportDate)
}
