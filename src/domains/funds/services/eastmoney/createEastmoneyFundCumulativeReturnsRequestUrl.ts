import {
  fundPerformanceRanges,
  type FundPerformanceRange,
} from '../../models/fundCumulativeReturns.ts'

const endpoint = 'https://fundcomapi.eastmoney.com/mm/newCore/FundVPageAccV2'

export function createEastmoneyFundCumulativeReturnsRequestUrl(
  fundCode: string,
  referenceIndexCode: string,
  range: FundPerformanceRange,
): URL {
  assertFundCode(fundCode, 'fund code')
  assertFundCode(referenceIndexCode, 'reference index code')
  if (!fundPerformanceRanges.includes(range)) {
    throw new TypeError('performance range is invalid')
  }

  const url = new URL(endpoint)
  url.search = new URLSearchParams({
    FCODE: fundCode,
    INDEXCODE: referenceIndexCode,
    POINTCOUNT: '',
    RANGE: range,
    deviceid: crypto.randomUUID(),
    plat: 'Iphone',
    product: 'EFund',
    startDate: '',
    version: '6.8.4',
  }).toString()
  return url
}

function assertFundCode(value: string, label: string): void {
  if (!/^\d{6}$/.test(value)) {
    throw new TypeError(`${label} must be exactly 6 digits`)
  }
}
