import {
  csi300TotalReturnIndexCode,
  csi300TotalReturnStartDate,
} from '../../models/indexPerformanceHistory.ts'

const csindexPerformanceProxyUrl =
  'https://seep.eu.org/www.csindex.com.cn/csindex-home/perf/index-perf'

export function createCsindexPerformanceRequestUrl(endDate: string): URL {
  if (!isCompactDate(endDate) || endDate < csi300TotalReturnStartDate) {
    throw new TypeError('CSIndex performance end date is invalid')
  }
  const url = new URL(csindexPerformanceProxyUrl)
  url.search = new URLSearchParams({
    endDate,
    indexCode: csi300TotalReturnIndexCode,
    startDate: csi300TotalReturnStartDate,
  }).toString()
  return url
}

export function formatShanghaiDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}${values.month}${values.day}`
}

function isCompactDate(value: string): boolean {
  if (!/^\d{8}$/.test(value)) return false
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}
