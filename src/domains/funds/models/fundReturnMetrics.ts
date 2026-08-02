import type { FundReinvestedNavPoint } from './fundReinvestedNav.ts'

export interface FundAnnualReturn {
  readonly value: number | null
  readonly year: number
}

export interface FundQuarterlyReturn {
  readonly firstQuarter: number | null
  readonly fourthQuarter: number | null
  readonly secondQuarter: number | null
  readonly thirdQuarter: number | null
  readonly year: number
}

export interface ReturnMetricPoint {
  readonly date: string
  readonly value: number
}

export interface FundReturnMetrics {
  readonly annualReturns: readonly FundAnnualReturn[]
  readonly annualized: {
    readonly fiveYears: number | null
    readonly oneYear: number | null
    readonly sinceInception: number | null
    readonly threeYears: number | null
    readonly twoYears: number | null
  }
  readonly cutoffDate: string | null
  readonly periods: {
    readonly fiveYears: number | null
    readonly oneMonth: number | null
    readonly oneWeek: number | null
    readonly oneYear: number | null
    readonly sinceInception: number | null
    readonly sixMonths: number | null
    readonly threeMonths: number | null
    readonly threeYears: number | null
    readonly twoYears: number | null
    readonly yearToDate: number | null
  }
  readonly quarterlyReturns: readonly FundQuarterlyReturn[]
}

const millisecondsPerDay = 86_400_000
const daysPerYear = 365.2425

export function calculateFundReturnMetrics(
  source: readonly FundReinvestedNavPoint[],
): FundReturnMetrics {
  return calculateReturnMetrics(
    source.map(({ date, reinvestedNetValue }) => ({ date, value: reinvestedNetValue })),
  )
}

export function calculateReturnMetrics(source: readonly ReturnMetricPoint[]): FundReturnMetrics {
  const points = source
    .filter((point) => isDate(point.date) && Number.isFinite(point.value) && point.value > 0)
    .sort((left, right) => left.date.localeCompare(right.date))
  const end = points.at(-1)
  if (!end) return emptyMetrics()

  const periodReturn = (targetDate: string): number | null =>
    returnBetween(findPointAtOrBefore(points, targetDate), end)
  const annualizedReturn = (targetDate: string): number | null =>
    cagr(findPointAtOrBefore(points, targetDate), end)
  const endDate = parseDate(end.date)
  const endYear = endDate.getUTCFullYear()
  const first = points[0]!

  return {
    annualReturns: annualReturns(points, first.date, end.date),
    annualized: {
      fiveYears: annualizedReturn(subtractYears(endDate, 5)),
      oneYear: annualizedReturn(subtractYears(endDate, 1)),
      sinceInception: cagr(points.length > 1 ? first : undefined, end),
      threeYears: annualizedReturn(subtractYears(endDate, 3)),
      twoYears: annualizedReturn(subtractYears(endDate, 2)),
    },
    cutoffDate: end.date,
    periods: {
      fiveYears: periodReturn(subtractYears(endDate, 5)),
      oneMonth: periodReturn(subtractMonths(endDate, 1)),
      oneWeek: periodReturn(addUtcDays(endDate, -7)),
      oneYear: periodReturn(subtractYears(endDate, 1)),
      sinceInception: returnBetween(points.length > 1 ? first : undefined, end),
      sixMonths: periodReturn(subtractMonths(endDate, 6)),
      threeMonths: periodReturn(subtractMonths(endDate, 3)),
      threeYears: periodReturn(subtractYears(endDate, 3)),
      twoYears: periodReturn(subtractYears(endDate, 2)),
      yearToDate: periodReturn(`${endYear - 1}-12-31`),
    },
    quarterlyReturns: quarterlyReturns(points, first.date, end.date),
  }
}

function quarterlyReturns(
  points: readonly ReturnMetricPoint[],
  firstDate: string,
  cutoffDate: string,
): readonly FundQuarterlyReturn[] {
  const firstYear = parseDate(firstDate).getUTCFullYear()
  const cutoff = parseDate(cutoffDate)
  const rows = new Map<number, Array<number | null>>()
  for (let year = firstYear; year <= cutoff.getUTCFullYear(); year += 1) {
    for (let quarter = 0; quarter < 4; quarter += 1) {
      const start = utcDate(year, quarter * 3, 1)
      const end = utcDate(year, quarter * 3 + 3, 0)
      if (formatDate(end) >= cutoffDate) continue
      const startPoint = findPointAtOrBefore(points, addUtcDays(start, -1))
      const endPoint = findPointInRange(points, formatDate(start), formatDate(end))
      const values = rows.get(year) ?? [null, null, null, null]
      values[quarter] = returnBetween(startPoint, endPoint)
      rows.set(year, values)
    }
  }
  return [...rows.entries()]
    .sort(([left], [right]) => right - left)
    .map(([year, values]) => ({
      firstQuarter: values[0] ?? null,
      fourthQuarter: values[3] ?? null,
      secondQuarter: values[1] ?? null,
      thirdQuarter: values[2] ?? null,
      year,
    }))
}

function annualReturns(
  points: readonly ReturnMetricPoint[],
  firstDate: string,
  cutoffDate: string,
): readonly FundAnnualReturn[] {
  const firstYear = parseDate(firstDate).getUTCFullYear()
  const cutoffYear = parseDate(cutoffDate).getUTCFullYear()
  const rows: FundAnnualReturn[] = []
  for (let year = firstYear; year <= cutoffYear; year += 1) {
    const endDate = `${year}-12-31`
    if (endDate >= cutoffDate) continue
    rows.push({
      value: returnBetween(
        findPointAtOrBefore(points, `${year - 1}-12-31`),
        findPointInRange(points, `${year}-01-01`, endDate),
      ),
      year,
    })
  }
  return rows.sort((left, right) => right.year - left.year)
}

function findPointAtOrBefore(
  points: readonly ReturnMetricPoint[],
  date: string,
): ReturnMetricPoint | undefined {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]!
    if (point.date <= date) return point
  }
  return undefined
}

function findPointInRange(
  points: readonly ReturnMetricPoint[],
  startDate: string,
  endDate: string,
): ReturnMetricPoint | undefined {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]!
    if (point.date >= startDate && point.date <= endDate) return point
  }
  return undefined
}

function returnBetween(
  start: ReturnMetricPoint | undefined,
  end: ReturnMetricPoint | undefined,
): number | null {
  return start && end && start.date < end.date ? end.value / start.value - 1 : null
}

function cagr(start: ReturnMetricPoint | undefined, end: ReturnMetricPoint): number | null {
  if (!start || start.date >= end.date) return null
  const days =
    (parseDate(end.date).getTime() - parseDate(start.date).getTime()) / millisecondsPerDay
  return days < 365 ? null : Math.pow(end.value / start.value, daysPerYear / days) - 1
}

function subtractMonths(date: Date, months: number): string {
  const targetMonth = date.getUTCMonth() - months
  const year = date.getUTCFullYear() + Math.floor(targetMonth / 12)
  const month = ((targetMonth % 12) + 12) % 12
  return formatDate(utcDate(year, month, Math.min(date.getUTCDate(), daysInMonth(year, month))))
}

function subtractYears(date: Date, years: number): string {
  const year = date.getUTCFullYear() - years
  const month = date.getUTCMonth()
  return formatDate(utcDate(year, month, Math.min(date.getUTCDate(), daysInMonth(year, month))))
}

function addUtcDays(date: Date, days: number): string {
  return formatDate(utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
}

function daysInMonth(year: number, month: number): number {
  return utcDate(year, month + 1, 0).getUTCDate()
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day))
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return utcDate(year!, month! - 1, day!)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && formatDate(parseDate(value)) === value
}

function emptyMetrics(): FundReturnMetrics {
  return {
    annualReturns: [],
    annualized: {
      fiveYears: null,
      oneYear: null,
      sinceInception: null,
      threeYears: null,
      twoYears: null,
    },
    cutoffDate: null,
    periods: {
      fiveYears: null,
      oneMonth: null,
      oneWeek: null,
      oneYear: null,
      sinceInception: null,
      sixMonths: null,
      threeMonths: null,
      threeYears: null,
      twoYears: null,
      yearToDate: null,
    },
    quarterlyReturns: [],
  }
}
