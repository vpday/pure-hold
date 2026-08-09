import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import { calculateDrawdownPath } from '@/domains/funds/models/drawdownPath.ts'
import type {
  FundReinvestedNavIssue,
  FundReinvestedNavResult,
} from '@/domains/funds/models/fundReinvestedNav.ts'
import type {
  IndexPerformanceHistory,
  IndexPerformanceHistoryIssue,
} from '@/domains/indices/models/indexPerformanceHistory.ts'
import { alignFundBenchmarkTimeSeries } from './fundBenchmarkTimeSeriesAlignment.ts'
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
  const aligned = alignFundBenchmarkTimeSeries(fund.points, benchmark.points)
  const { commonCutoffDate } = aligned

  if (!commonCutoffDate) return emptyResult(fund, benchmark, null)

  const truncatedFund: FundReinvestedNavResult = {
    appliedEvents: fund.appliedEvents.filter(({ date }) => date <= commonCutoffDate),
    issues: fund.issues,
    points: aligned.fundPoints.filter(({ date }) => date <= commonCutoffDate),
  }
  const selectedFundPoints = selectFundReinvestedNavRange(truncatedFund, range).points
  const selectedDates = new Set(selectedFundPoints.map(({ date }) => date))
  const commonPoints = aligned.commonPoints.filter(({ date }) => selectedDates.has(date))
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
