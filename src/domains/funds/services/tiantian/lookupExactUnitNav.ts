import type { FundNetValueHistory } from '../../models/fundNetValueHistory.ts'
import { fetchTiantianFundNetValueHistory } from './fetchTiantianFundNetValueHistory.ts'

export interface FundValue {
  readonly date: string
  readonly source: 'nav-history'
  readonly unitNav: number
}

export async function lookupExactUnitNav(
  fundCode: string,
  date: string,
  signal?: AbortSignal,
): Promise<FundValue | null> {
  if (!isHistoricalDate(date)) return null
  const history = await fetchTiantianFundNetValueHistory(fundCode, 'ln', signal)
  return toFundValue(history, date)
}

function toFundValue(history: FundNetValueHistory, date: string): FundValue | null {
  const point = history.points.find(
    (candidate) =>
      candidate.date === date &&
      candidate.unitNetValue !== null &&
      Number.isFinite(candidate.unitNetValue) &&
      candidate.unitNetValue > 0,
  )
  if (!point || point.unitNetValue === null) return null
  return { date: point.date, source: 'nav-history', unitNav: point.unitNetValue }
}

function isHistoricalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value < shanghaiDate()
  )
}

function shanghaiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
