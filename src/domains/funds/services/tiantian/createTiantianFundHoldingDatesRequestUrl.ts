import { createTiantianRequestParams } from './createTiantianRequestParams.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundIVInfoMultiple'

export function createTiantianFundHoldingDatesRequestUrl(fundCode: string): URL {
  assertFundCode(fundCode)
  const url = new URL(endpoint)
  url.search = createTiantianRequestParams({ FCODE: fundCode }).toString()
  return url
}

function assertFundCode(fundCode: string): void {
  if (!/^\d{6}$/.test(fundCode)) throw new Error('fund code must be exactly 6 digits')
}
