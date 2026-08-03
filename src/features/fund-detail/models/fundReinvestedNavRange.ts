import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type {
  FundReinvestedNavAppliedEvent,
  FundReinvestedNavPoint,
  FundReinvestedNavResult,
} from '@/domains/funds/models/fundReinvestedNav.ts'

export interface FundReinvestedNavRangeResult {
  readonly appliedEvents: readonly FundReinvestedNavAppliedEvent[]
  readonly points: readonly FundReinvestedNavPoint[]
}

export function selectFundReinvestedNavRange(
  result: FundReinvestedNavResult,
  range: FundHistoryRange,
): FundReinvestedNavRangeResult {
  if (range === 'ln') return { appliedEvents: result.appliedEvents, points: result.points }
  const endDate = result.points.at(-1)?.date
  if (!endDate) return { appliedEvents: [], points: [] }
  const startDate = rangeStart(endDate, range)
  return {
    appliedEvents: result.appliedEvents.filter(({ date }) => date >= startDate && date <= endDate),
    points: result.points.filter(({ date }) => date >= startDate && date <= endDate),
  }
}

function rangeStart(endDate: string, range: Exclude<FundHistoryRange, 'ln'>): string {
  const date = new Date(`${endDate}T00:00:00.000Z`)
  if (range === 'jn') return `${date.getUTCFullYear()}-01-01`
  if (range === 'y' || range === '3y' || range === '6y') {
    const months = range === 'y' ? 1 : range === '3y' ? 3 : 6
    return formatDate(subtractMonths(date, months))
  }
  return formatDate(subtractYears(date, yearCount(range)))
}

function subtractMonths(date: Date, count: number): Date {
  const targetMonth = date.getUTCMonth() - count
  const target = new Date(Date.UTC(date.getUTCFullYear(), targetMonth, 1))
  target.setUTCDate(
    Math.min(date.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth())),
  )
  return target
}

function subtractYears(date: Date, count: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear() - count, date.getUTCMonth(), 1))
  target.setUTCDate(
    Math.min(date.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth())),
  )
  return target
}

function yearCount(range: 'n' | '3n' | '5n'): number {
  return range === 'n' ? 1 : range === '3n' ? 3 : 5
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
