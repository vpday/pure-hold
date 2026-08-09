export type FundRollingExcessReturnSummaryColor = 'benchmark' | 'excess' | 'fund'
export type FundRollingExcessReturnSummaryTrend = 'down' | 'neutral' | 'up'

export interface FundRollingExcessReturnSummaryItem {
  readonly color: FundRollingExcessReturnSummaryColor
  readonly label: string
  readonly trend: FundRollingExcessReturnSummaryTrend
  readonly valueText: string
}

export interface FundRollingExcessReturnChartSeries {
  readonly name: '滚动12个月超额收益'
  readonly values: readonly number[]
}

export interface FundRollingExcessReturnChartModel {
  readonly actualRangeText: string
  readonly benchmarkValues: readonly number[]
  readonly commonCutoffText: string
  readonly dates: readonly string[]
  readonly emptyText: string
  readonly fundValues: readonly number[]
  readonly rangeLabel: string
  readonly series: FundRollingExcessReturnChartSeries
  readonly summary: readonly [
    FundRollingExcessReturnSummaryItem,
    FundRollingExcessReturnSummaryItem,
    FundRollingExcessReturnSummaryItem,
  ]
}
