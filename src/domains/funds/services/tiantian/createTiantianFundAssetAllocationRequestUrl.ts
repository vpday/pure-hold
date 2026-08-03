import { createTiantianRequestParams } from './createTiantianRequestParams.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundAssetAllocationTop'

export function createTiantianFundAssetAllocationRequestUrl(fundCode: string): URL {
  if (!/^\d{6}$/.test(fundCode)) {
    throw new TypeError('fund code must be exactly 6 digits')
  }

  const url = new URL(endpoint)
  url.search = createTiantianRequestParams({ FCODE: fundCode, top: '20' }).toString()
  return url
}
