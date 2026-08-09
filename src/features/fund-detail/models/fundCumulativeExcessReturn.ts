import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type {
  FundReinvestedNavIssue,
  FundReinvestedNavResult,
} from '@/domains/funds/models/fundReinvestedNav.ts'
import type {
  IndexPerformanceHistory,
  IndexPerformanceHistoryIssue,
} from '@/domains/indices/models/indexPerformanceHistory.ts'
import { alignFundBenchmarkTimeSeries } from './fundBenchmarkTimeSeriesAlignment.ts'
import { calculateRelativeReturn } from './fundMetricsComparison.ts'
import { selectFundReinvestedNavRange } from './fundReinvestedNavRange.ts'

export interface FundCumulativeExcessReturnPoint {
  readonly benchmarkReturn: number
  readonly date: string
  readonly fundReturn: number
  readonly excessReturn: number
}

export interface FundBenchmarkSourceIssues {
  readonly benchmark: readonly IndexPerformanceHistoryIssue[]
  readonly fund: readonly FundReinvestedNavIssue[]
}

export interface FundCumulativeExcessReturnResult {
  readonly benchmarkName: string
  readonly benchmarkReturn: number | null
  readonly commonCutoffDate: string | null
  readonly fundReturn: number | null
  readonly points: readonly FundCumulativeExcessReturnPoint[]
  readonly excessReturn: number | null
  readonly sourceIssues: FundBenchmarkSourceIssues
  readonly startDate: string | null
  readonly status: 'insufficient-data' | 'ready'
}

export function calculateFundCumulativeExcessReturn(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
  range: FundHistoryRange,
): FundCumulativeExcessReturnResult {
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

  const first = commonPoints[0]!
  const points = commonPoints.map(({ benchmarkPoint, fundPoint }) => {
    const fundReturn = fundPoint.reinvestedNetValue / first.fundPoint.reinvestedNetValue - 1
    const benchmarkReturn = benchmarkPoint.value / first.benchmarkPoint.value - 1
    const excessReturn = calculateRelativeReturn(fundReturn, benchmarkReturn)!
    return { benchmarkReturn, date: fundPoint.date, excessReturn, fundReturn }
  })
  const latest = points.at(-1)!

  return {
    benchmarkName: benchmark.indexName,
    benchmarkReturn: latest.benchmarkReturn,
    commonCutoffDate,
    fundReturn: latest.fundReturn,
    points,
    excessReturn: latest.excessReturn,
    sourceIssues: sourceIssues(fund, benchmark),
    startDate: points[0]!.date,
    status: 'ready',
  }
}

function emptyResult(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
  commonCutoffDate: string | null,
): FundCumulativeExcessReturnResult {
  return {
    benchmarkName: benchmark.indexName,
    benchmarkReturn: null,
    commonCutoffDate,
    fundReturn: null,
    points: [],
    excessReturn: null,
    sourceIssues: sourceIssues(fund, benchmark),
    startDate: null,
    status: 'insufficient-data',
  }
}

function sourceIssues(
  fund: FundReinvestedNavResult,
  benchmark: IndexPerformanceHistory,
): FundBenchmarkSourceIssues {
  return { benchmark: benchmark.issues, fund: fund.issues }
}
