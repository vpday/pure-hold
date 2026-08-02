import type { FundDistributionHistory } from './fundDistributionHistory.ts'
import type { FundNetValueHistory } from './fundNetValueHistory.ts'

export type FundReinvestedNavIssueCode =
  | 'duplicate-conversion'
  | 'first-date-conversion'
  | 'first-date-dividend'
  | 'invalid-conversion'
  | 'invalid-dividend'
  | 'invalid-unit-net-value'
  | 'unmatched-conversion-date'
  | 'unmatched-dividend-date'

export interface FundReinvestedNavIssue {
  readonly code: FundReinvestedNavIssueCode
  readonly count: number
  readonly date: string
}

export interface FundReinvestedNavPoint {
  readonly date: string
  readonly reinvestedNetValue: number
  readonly unitNetValue: number
}

export interface FundReinvestedNavResult {
  readonly issues: readonly FundReinvestedNavIssue[]
  readonly points: readonly FundReinvestedNavPoint[]
}

export function calculateFundReinvestedNav(
  netValueHistory: FundNetValueHistory,
  distributionHistory: FundDistributionHistory,
): FundReinvestedNavResult {
  if (netValueHistory.fundCode !== distributionHistory.fundCode) {
    throw new TypeError('fund histories must belong to the same fund')
  }

  const issues: FundReinvestedNavIssue[] = []
  const netValues = netValueHistory.points
    .flatMap((point) => {
      if (!isPositiveFiniteNumber(point.unitNetValue)) {
        issues.push({ code: 'invalid-unit-net-value', count: 1, date: point.date })
        return []
      }
      return [{ date: point.date, unitNetValue: point.unitNetValue }]
    })
    .sort((left, right) => left.date.localeCompare(right.date))
  const netValueDates = new Set(netValues.map(({ date }) => date))
  const firstDate = netValues[0]?.date
  const dividendsByDate = new Map<string, number>()

  for (const dividend of distributionHistory.dividends) {
    const date = dividend.exDividendDate
    if (!isNonNegativeFiniteNumber(dividend.dividendPerTenUnits)) {
      issues.push({ code: 'invalid-dividend', count: 1, date })
    } else if (!netValueDates.has(date)) {
      issues.push({ code: 'unmatched-dividend-date', count: 1, date })
    } else if (date === firstDate) {
      issues.push({ code: 'first-date-dividend', count: 1, date })
    } else {
      dividendsByDate.set(
        date,
        (dividendsByDate.get(date) ?? 0) + dividend.dividendPerTenUnits / 10,
      )
    }
  }

  const conversionsByDate = new Map<string, number[]>()
  for (const conversion of distributionHistory.conversions) {
    const date = conversion.conversionDate
    if (!isPositiveFiniteNumber(conversion.ratio)) {
      issues.push({ code: 'invalid-conversion', count: 1, date })
    } else if (!netValueDates.has(date)) {
      issues.push({ code: 'unmatched-conversion-date', count: 1, date })
    } else if (date === firstDate) {
      issues.push({ code: 'first-date-conversion', count: 1, date })
    } else {
      const values = conversionsByDate.get(date) ?? []
      values.push(conversion.ratio)
      conversionsByDate.set(date, values)
    }
  }

  const conversionByDate = new Map<string, number>()
  for (const [date, ratios] of conversionsByDate) {
    if (ratios.length > 1) {
      issues.push({ code: 'duplicate-conversion', count: ratios.length, date })
    } else {
      conversionByDate.set(date, ratios[0]!)
    }
  }

  const first = netValues[0]
  if (!first) return { issues, points: [] }
  const points: FundReinvestedNavPoint[] = [{ ...first, reinvestedNetValue: first.unitNetValue }]
  for (const point of netValues.slice(1)) {
    const previous = points.at(-1)!
    const reinvestedNetValue =
      (previous.reinvestedNetValue *
        (point.unitNetValue * (conversionByDate.get(point.date) ?? 1) +
          (dividendsByDate.get(point.date) ?? 0))) /
      previous.unitNetValue
    points.push({ ...point, reinvestedNetValue })
  }

  return { issues, points }
}

function isPositiveFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0
}

function isNonNegativeFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0
}
