import { fundHistoryRanges, type FundHistoryRange } from '../../models/fundHistoryRange.ts'
import { createTiantianRequestParams } from './createTiantianRequestParams.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/newCore/FundVPageAccV2'

export function createTiantianFundCumulativeReturnsRequestUrl(
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
  url.search = createTiantianRequestParams({
    FCODE: fundCode,
    INDEXCODE: referenceIndexCode,
    POINTCOUNT: '',
    RANGE: range,
    startDate: '',
  }).toString()
  return url
}

function assertFundCode(value: string, label: string): void {
  if (!/^\d{6}$/.test(value)) {
    throw new TypeError(`${label} must be exactly 6 digits`)
  }
}
