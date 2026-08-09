import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import { calculateDrawdownPath } from '@/domains/funds/models/drawdownPath.ts'
import type {
  FundReinvestedNavIssue,
  FundReinvestedNavPoint,
  FundReinvestedNavResult,
} from '@/domains/funds/models/fundReinvestedNav.ts'
import type {
  IndexPerformanceHistory,
  IndexPerformanceHistoryIssue,
  IndexPerformancePoint,
} from '@/domains/indices/models/indexPerformanceHistory.ts'
import { selectFundReinvestedNavRange } from './fundReinvestedNavRange.ts'

export type FundDrawdownRange = Extract<FundHistoryRange, 'n' | '3n' | '5n' | 'ln'>

export interface FundDrawdownComparisonPoint {
  readonly benchmarkDrawdown: number
  readonly date: string
  readonly fundDrawdown: number
}

export interface FundDrawdownComparisonSourceIssues {
  readonly benchmark: readonly IndexPerformanceHistoryIssue[]
  readonly fund: readonly FundReinvestedNavIssue[]
}

export interface FundDrawdownComparisonResult {
  readonly benchmarkMaximumDrawdown: number | null
  readonly benchmarkName: string
  readonly commonCutoffDate: string | null
  readonly fundMaximumDrawdown: number | null
  readonly points: readonly FundDrawdownComparisonPoint[]
  readonly sourceIssues: FundDrawdownComparisonSourceIssues
  readonly startDate: string | null
  readonly status: 'insufficient-data' | 'ready'
}

export function calculateFundDrawdownComparison(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
  range: FundDrawdownRange,
): FundDrawdownComparisonResult {
  const fundPoints = validFundPoints(fund.points)
  const benchmarkPoints = validBenchmarkPoints(benchmark.points)
  const benchmarkByDate = new Map(benchmarkPoints.map((point) => [point.date, point]))
  const commonCutoffDate = fundPoints
    .map(({ date }) => date)
    .filter((date) => benchmarkByDate.has(date))
    .at(-1)

  if (!commonCutoffDate) return emptyResult(fund, benchmark, null)

  const truncatedFund: FundReinvestedNavResult = {
    appliedEvents: fund.appliedEvents.filter(({ date }) => date <= commonCutoffDate),
    issues: fund.issues,
    points: fundPoints.filter(({ date }) => date <= commonCutoffDate),
  }
  const commonPoints = selectFundReinvestedNavRange(truncatedFund, range).points.flatMap(
    (fundPoint) => {
      const benchmarkPoint = benchmarkByDate.get(fundPoint.date)
      return benchmarkPoint ? [{ benchmarkPoint, fundPoint }] : []
    },
  )
  if (commonPoints.length < 2) return emptyResult(fund, benchmark, commonCutoffDate)

  const fundPath = calculateDrawdownPath(
    commonPoints.map(({ fundPoint }) => ({
      date: fundPoint.date,
      value: fundPoint.reinvestedNetValue,
    })),
  )
  const benchmarkPath = calculateDrawdownPath(
    commonPoints.map(({ benchmarkPoint }) => ({
      date: benchmarkPoint.date,
      value: benchmarkPoint.value,
    })),
  )
  const points = fundPath.points.map(({ date, drawdown: fundDrawdown }, index) => ({
    benchmarkDrawdown: benchmarkPath.points[index]!.drawdown,
    date,
    fundDrawdown,
  }))

  return {
    benchmarkMaximumDrawdown: benchmarkPath.maximumDrawdown,
    benchmarkName: benchmark.indexName,
    commonCutoffDate,
    fundMaximumDrawdown: fundPath.maximumDrawdown,
    points,
    sourceIssues: sourceIssues(fund, benchmark),
    startDate: points[0]!.date,
    status: 'ready',
  }
}

function emptyResult(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
  commonCutoffDate: string | null,
): FundDrawdownComparisonResult {
  return {
    benchmarkMaximumDrawdown: null,
    benchmarkName: benchmark.indexName,
    commonCutoffDate,
    fundMaximumDrawdown: null,
    points: [],
    sourceIssues: sourceIssues(fund, benchmark),
    startDate: null,
    status: 'insufficient-data',
  }
}

function sourceIssues(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
): FundDrawdownComparisonSourceIssues {
  return { benchmark: benchmark.issues, fund: fund.issues }
}

function validFundPoints(source: readonly FundReinvestedNavPoint[]) {
  return uniqueByDate(
    source.filter(
      ({ date, reinvestedNetValue }) =>
        isIsoDate(date) && Number.isFinite(reinvestedNetValue) && reinvestedNetValue > 0,
    ),
  )
}

function validBenchmarkPoints(source: readonly IndexPerformancePoint[]) {
  return uniqueByDate(
    source.filter(({ date, value }) => isIsoDate(date) && Number.isFinite(value) && value > 0),
  )
}

function uniqueByDate<T extends { readonly date: string }>(source: readonly T[]): readonly T[] {
  const byDate = new Map<string, T>()
  for (const point of source) {
    if (!byDate.has(point.date)) byDate.set(point.date, point)
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date))
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
