import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
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
import { calculateRelativeReturn } from './fundMetricsComparison.ts'
import { selectFundReinvestedNavRange } from './fundReinvestedNavRange.ts'

export interface FundRelativeBenchmarkPoint {
  readonly benchmarkReturn: number
  readonly date: string
  readonly fundReturn: number
  readonly relativeReturn: number
}

export interface FundRelativeBenchmarkSourceIssues {
  readonly benchmark: readonly IndexPerformanceHistoryIssue[]
  readonly fund: readonly FundReinvestedNavIssue[]
}

export interface FundRelativeBenchmarkResult {
  readonly benchmarkName: string
  readonly benchmarkReturn: number | null
  readonly commonCutoffDate: string | null
  readonly fundReturn: number | null
  readonly points: readonly FundRelativeBenchmarkPoint[]
  readonly relativeReturn: number | null
  readonly sourceIssues: FundRelativeBenchmarkSourceIssues
  readonly startDate: string | null
  readonly status: 'insufficient-data' | 'ready'
}

export function calculateFundRelativeBenchmark(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
  range: FundHistoryRange,
): FundRelativeBenchmarkResult {
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
  const selectedFundPoints = selectFundReinvestedNavRange(truncatedFund, range).points
  const commonPoints = selectedFundPoints.flatMap((fundPoint) => {
    const benchmarkPoint = benchmarkByDate.get(fundPoint.date)
    return benchmarkPoint ? [{ benchmarkPoint, fundPoint }] : []
  })
  if (commonPoints.length < 2) return emptyResult(fund, benchmark, commonCutoffDate)

  const first = commonPoints[0]!
  const points = commonPoints.map(({ benchmarkPoint, fundPoint }) => {
    const fundReturn = fundPoint.reinvestedNetValue / first.fundPoint.reinvestedNetValue - 1
    const benchmarkReturn = benchmarkPoint.value / first.benchmarkPoint.value - 1
    const relativeReturn = calculateRelativeReturn(fundReturn, benchmarkReturn)!
    return { benchmarkReturn, date: fundPoint.date, fundReturn, relativeReturn }
  })
  const latest = points.at(-1)!

  return {
    benchmarkName: benchmark.indexName,
    benchmarkReturn: latest.benchmarkReturn,
    commonCutoffDate,
    fundReturn: latest.fundReturn,
    points,
    relativeReturn: latest.relativeReturn,
    sourceIssues: sourceIssues(fund, benchmark),
    startDate: points[0]!.date,
    status: 'ready',
  }
}

function emptyResult(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
  commonCutoffDate: string | null,
): FundRelativeBenchmarkResult {
  return {
    benchmarkName: benchmark.indexName,
    benchmarkReturn: null,
    commonCutoffDate,
    fundReturn: null,
    points: [],
    relativeReturn: null,
    sourceIssues: sourceIssues(fund, benchmark),
    startDate: null,
    status: 'insufficient-data',
  }
}

function sourceIssues(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
): FundRelativeBenchmarkSourceIssues {
  return { benchmark: benchmark.issues, fund: fund.issues }
}

function validFundPoints(
  source: readonly FundReinvestedNavPoint[],
): readonly FundReinvestedNavPoint[] {
  return uniqueByDate(
    source.filter(
      ({ date, reinvestedNetValue }) =>
        isIsoDate(date) && Number.isFinite(reinvestedNetValue) && reinvestedNetValue > 0,
    ),
  )
}

function validBenchmarkPoints(
  source: readonly IndexPerformancePoint[],
): readonly IndexPerformancePoint[] {
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
