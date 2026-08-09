export type FundRelativeBenchmarkSummaryColor = 'benchmark' | 'fund' | 'relative'
export type FundRelativeBenchmarkSummaryTrend = 'down' | 'neutral' | 'up'

export interface FundRelativeBenchmarkSummaryItem {
  readonly color: FundRelativeBenchmarkSummaryColor
  readonly label: string
  readonly trend: FundRelativeBenchmarkSummaryTrend
  readonly valueText: string
}

export interface FundRelativeBenchmarkChartSeries {
  readonly name: '累计超额收益'
  readonly values: readonly (number | null)[]
}

export interface FundRelativeBenchmarkChartModel {
  readonly actualRangeText: string
  readonly commonCutoffText: string
  readonly dates: readonly string[]
  readonly emptyText: string
  readonly rangeLabel: string
  readonly series: FundRelativeBenchmarkChartSeries
  readonly summary: readonly [
    FundRelativeBenchmarkSummaryItem,
    FundRelativeBenchmarkSummaryItem,
    FundRelativeBenchmarkSummaryItem,
  ]
}
