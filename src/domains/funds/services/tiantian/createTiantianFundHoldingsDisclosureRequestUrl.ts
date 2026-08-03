import { createTiantianRequestParams } from './createTiantianRequestParams.ts'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundInverstPosition'

export function createTiantianFundHoldingsDisclosureRequestUrl(
  fundCode: string,
  reportDate: string,
): URL {
  if (!/^\d{6}$/.test(fundCode)) throw new Error('fund code must be exactly 6 digits')
  if (!isValidDate(reportDate)) throw new Error('report date must be a valid YYYY-MM-DD date')
  const url = new URL(endpoint)
  url.search = createTiantianRequestParams({
    DATE: reportDate,
    FCODE: fundCode,
    appType: 'ttjj',
  }).toString()
  return url
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  )
}
