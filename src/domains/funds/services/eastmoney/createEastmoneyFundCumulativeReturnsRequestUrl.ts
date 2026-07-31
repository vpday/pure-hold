import { fundHistoryRanges, type FundHistoryRange } from '../../models/fundHistoryRange.ts'

const endpoint = 'https://fundcomapi.eastmoney.com/mm/newCore/FundVPageAccV2'

export function createEastmoneyFundCumulativeReturnsRequestUrl(
  fundCode: string,
  referenceIndexCode: string,
  range: FundHistoryRange,
): URL {
  assertFundCode(fundCode, 'fund code')
  assertFundCode(referenceIndexCode, 'reference index code')
  if (!fundHistoryRanges.includes(range)) {
    throw new TypeError('fund history range is invalid')
  }

  const url = new URL(endpoint)
  url.search = new URLSearchParams({
    FCODE: fundCode,
    INDEXCODE: referenceIndexCode,
    POINTCOUNT: '',
    RANGE: range,
    deviceid: crypto.randomUUID(),
    plat: 'Web',
    product: 'EFund',
    startDate: '',
    version: '6.5.5',
  }).toString()
  return url
}

function assertFundCode(value: string, label: string): void {
  if (!/^\d{6}$/.test(value)) {
    throw new TypeError(`${label} must be exactly 6 digits`)
  }
}
