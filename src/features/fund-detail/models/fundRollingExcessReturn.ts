import type { FundReinvestedNavResult } from '@/domains/funds/models/fundReinvestedNav.ts'
import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { calculateRelativeReturn } from './fundMetricsComparison.ts'
import {
  calculateFundRelativeBenchmark,
  type FundRelativeBenchmarkPoint,
  type FundRelativeBenchmarkSourceIssues,
} from './fundRelativeBenchmark.ts'

export type FundRollingExcessRange = 'n' | '3n' | '5n' | 'ln'

export interface FundRollingExcessReturnPoint {
  readonly benchmarkTrailingTwelveMonthReturn: number
  readonly date: string
  readonly excessReturn: number
  readonly fundTrailingTwelveMonthReturn: number
}

export interface FundRollingExcessReturnResult {
  readonly benchmarkName: string
  readonly commonCutoffDate: string | null
  readonly points: readonly FundRollingExcessReturnPoint[]
  readonly sourceIssues: FundRelativeBenchmarkSourceIssues
  readonly startDate: string | null
  readonly status: 'insufficient-data' | 'ready'
}

interface MonthlyEndpoint {
  readonly month: string
  readonly point: FundRelativeBenchmarkPoint
}

const rangeMonthCounts: Readonly<Record<Exclude<FundRollingExcessRange, 'ln'>, number>> = {
  '3n': 36,
  '5n': 60,
  n: 12,
}

export function calculateFundRollingExcessReturn(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
  range: FundRollingExcessRange,
): FundRollingExcessReturnResult {
  const aligned = calculateFundRelativeBenchmark(fund, benchmark, 'ln')
  const completion = completedMonthCutoff(benchmark.endDate)
  if (!completion) return emptyResult(aligned)

  const endpoints = monthlyEndpoints(aligned.points).filter(
    ({ month }) =>
      month < completion.month || (completion.includeCurrentMonth && month === completion.month),
  )
  const endpointByMonth = new Map(endpoints.map((endpoint) => [endpoint.month, endpoint]))
  const points = endpoints.flatMap((current) => {
    const prior = endpointByMonth.get(shiftMonth(current.month, -12))
    if (!prior) return []

    const fundTrailingTwelveMonthReturn = periodReturn(
      current.point.fundReturn,
      prior.point.fundReturn,
    )
    const benchmarkTrailingTwelveMonthReturn = periodReturn(
      current.point.benchmarkReturn,
      prior.point.benchmarkReturn,
    )
    const excessReturn = calculateRelativeReturn(
      fundTrailingTwelveMonthReturn,
      benchmarkTrailingTwelveMonthReturn,
    )!
    return [
      {
        benchmarkTrailingTwelveMonthReturn,
        date: current.point.date,
        excessReturn,
        fundTrailingTwelveMonthReturn,
      },
    ]
  })
  const selectedPoints = selectRange(points, endpoints.at(-1)?.month, range)
  if (!selectedPoints.length) return emptyResult(aligned)

  return {
    benchmarkName: aligned.benchmarkName,
    commonCutoffDate: aligned.commonCutoffDate,
    points: selectedPoints,
    sourceIssues: aligned.sourceIssues,
    startDate: selectedPoints[0]!.date,
    status: 'ready',
  }
}

function emptyResult(
  aligned: ReturnType<typeof calculateFundRelativeBenchmark>,
): FundRollingExcessReturnResult {
  return {
    benchmarkName: aligned.benchmarkName,
    commonCutoffDate: aligned.commonCutoffDate,
    points: [],
    sourceIssues: aligned.sourceIssues,
    startDate: null,
    status: 'insufficient-data',
  }
}

function monthlyEndpoints(
  points: readonly FundRelativeBenchmarkPoint[],
): readonly MonthlyEndpoint[] {
  const byMonth = new Map<string, FundRelativeBenchmarkPoint>()
  for (const point of points) byMonth.set(point.date.slice(0, 7), point)
  return [...byMonth].map(([month, point]) => ({ month, point }))
}

function completedMonthCutoff(
  endDate: string,
): { readonly includeCurrentMonth: boolean; readonly month: string } | null {
  if (!/^\d{8}$/.test(endDate)) return null
  const year = Number(endDate.slice(0, 4))
  const monthIndex = Number(endDate.slice(4, 6)) - 1
  const day = Number(endDate.slice(6, 8))
  const date = new Date(Date.UTC(year, monthIndex, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  return {
    includeCurrentMonth: day === lastDay,
    month: `${String(year).padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}`,
  }
}

function periodReturn(current: number, prior: number): number {
  return (1 + current) / (1 + prior) - 1
}

function selectRange(
  points: readonly FundRollingExcessReturnPoint[],
  latestMonth: string | undefined,
  range: FundRollingExcessRange,
): readonly FundRollingExcessReturnPoint[] {
  if (range === 'ln' || !latestMonth) return points
  const firstMonth = shiftMonth(latestMonth, -(rangeMonthCounts[range] - 1))
  return points.filter(({ date }) => date.slice(0, 7) >= firstMonth)
}

function shiftMonth(month: string, offset: number): string {
  const year = Number(month.slice(0, 4))
  const monthIndex = Number(month.slice(5, 7)) - 1
  const shifted = new Date(Date.UTC(year, monthIndex + offset, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}
