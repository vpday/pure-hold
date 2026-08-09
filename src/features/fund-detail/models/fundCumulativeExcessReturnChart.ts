export type FundCumulativeExcessReturnSummaryColor = 'benchmark' | 'excess' | 'fund'
export type FundCumulativeExcessReturnSummaryTrend = 'down' | 'neutral' | 'up'

export interface FundCumulativeExcessReturnSummaryItem {
  readonly color: FundCumulativeExcessReturnSummaryColor
  readonly label: string
  readonly trend: FundCumulativeExcessReturnSummaryTrend
  readonly valueText: string
}

export interface FundCumulativeExcessReturnChartSeries {
  readonly name: '累计超额收益'
  readonly values: readonly (number | null)[]
}

export interface FundCumulativeExcessReturnChartModel {
  readonly actualRangeText: string
  readonly commonCutoffText: string
  readonly dates: readonly string[]
  readonly emptyText: string
  readonly rangeLabel: string
  readonly series: FundCumulativeExcessReturnChartSeries
  readonly summary: readonly [
    FundCumulativeExcessReturnSummaryItem,
    FundCumulativeExcessReturnSummaryItem,
    FundCumulativeExcessReturnSummaryItem,
  ]
}
