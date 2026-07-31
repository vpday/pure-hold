import { createTiantianRequestParams } from './createTiantianRequestParams.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundBonusDetail'

export function createTiantianFundDistributionRequestUrl(fundCode: string): URL {
  if (!/^\d{6}$/.test(fundCode)) {
    throw new TypeError('fund code must be exactly 6 digits')
  }

  const url = new URL(endpoint)
  url.search = createTiantianRequestParams({
    FCODE: fundCode,
  }).toString()
  return url
}
