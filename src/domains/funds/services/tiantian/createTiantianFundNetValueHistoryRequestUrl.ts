import { fundHistoryRanges, type FundHistoryRange } from '../../models/fundHistoryRange.ts'
import { createTiantianRequestParams } from './createTiantianRequestParams.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/newCore/FundVPageDiagramNew'

export function createTiantianFundNetValueHistoryRequestUrl(
  fundCode: string,
  range: FundHistoryRange,
): URL {
  if (!/^\d{6}$/.test(fundCode)) {
    throw new TypeError('fund code must be exactly 6 digits')
  }
  if (!(fundHistoryRanges as readonly string[]).includes(range)) {
    throw new TypeError('fund history range is invalid')
  }

  const url = new URL(endpoint)
  url.search = createTiantianRequestParams({
    FCODE: fundCode,
    POINTCOUNT: '',
    RANGE: range,
  }).toString()
  return url
}
