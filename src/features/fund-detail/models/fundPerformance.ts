import type {
  FundCumulativeReturns,
  FundPerformanceRange,
} from '@/domains/funds/models/fundCumulativeReturns'

export interface FundPerformanceRangeOption {
  readonly label: string
  readonly value: FundPerformanceRange
}

export interface FundReferenceIndexOption {
  readonly code: string
  readonly name: string
}

export interface FundPerformanceChartSeries {
  readonly name: string
  readonly values: readonly (number | null)[]
}

export type FundPerformanceSummaryColor = 'drawdown' | 'fund' | 'peer' | 'reference'

export interface FundPerformanceSummaryItem {
  readonly color: FundPerformanceSummaryColor
  readonly label: string
  readonly valueText: string
}

export interface FundPerformanceChartModel {
  readonly dates: readonly string[]
  readonly series: readonly [
    FundPerformanceChartSeries,
    FundPerformanceChartSeries,
    FundPerformanceChartSeries,
  ]
  readonly summary: readonly [
    FundPerformanceSummaryItem,
    FundPerformanceSummaryItem,
    FundPerformanceSummaryItem,
    FundPerformanceSummaryItem,
  ]
}

export type LoadFundCumulativeReturns = (
  fundCode: string,
  referenceIndexCode: string,
  range: FundPerformanceRange,
  signal?: AbortSignal,
) => Promise<FundCumulativeReturns>
