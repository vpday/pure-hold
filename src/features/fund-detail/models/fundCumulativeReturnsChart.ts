import type { FundCumulativeReturns } from '@/domains/funds/models/fundCumulativeReturns'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'

export interface FundReferenceIndexOption {
  readonly code: string
  readonly name: string
}

export interface FundCumulativeReturnsChartSeries {
  readonly name: string
  readonly values: readonly (number | null)[]
}

export type FundCumulativeReturnsSummaryColor = 'drawdown' | 'fund' | 'peer' | 'reference'

export interface FundCumulativeReturnsSummaryItem {
  readonly color: FundCumulativeReturnsSummaryColor
  readonly label: string
  readonly valueText: string
}

export interface FundCumulativeReturnsDrawdownModel {
  readonly peakIndex: number
  readonly troughIndex: number
}

export interface FundCumulativeReturnsChartModel {
  readonly dates: readonly string[]
  readonly drawdown?: FundCumulativeReturnsDrawdownModel
  readonly series: readonly [
    FundCumulativeReturnsChartSeries,
    FundCumulativeReturnsChartSeries,
    FundCumulativeReturnsChartSeries,
  ]
  readonly summary: readonly [
    FundCumulativeReturnsSummaryItem,
    FundCumulativeReturnsSummaryItem,
    FundCumulativeReturnsSummaryItem,
    FundCumulativeReturnsSummaryItem,
  ]
}

export type LoadFundCumulativeReturns = (
  fundCode: string,
  referenceIndexCode: string,
  range: FundHistoryRange,
  signal?: AbortSignal,
) => Promise<FundCumulativeReturns>
