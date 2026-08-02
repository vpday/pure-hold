export type FundMetricsView = 'annualized' | 'calendar' | 'periods'
export type FundMetricTrend = 'down' | 'flat' | 'unknown' | 'up'

export interface FundMetricValueModel {
  readonly text: string
  readonly trend: FundMetricTrend
}

export interface FundMetricComparisonRowModel {
  readonly benchmark: FundMetricValueModel
  readonly excess: FundMetricValueModel
  readonly fund: FundMetricValueModel
  readonly key: string
  readonly label: string
}

export interface FundMetricsSectionModel {
  readonly annualized: readonly FundMetricComparisonRowModel[]
  readonly annualReturns: readonly FundMetricComparisonRowModel[]
  readonly cutoffText: string
  readonly periods: readonly FundMetricComparisonRowModel[]
  readonly quarterlyReturns: readonly FundMetricComparisonRowModel[]
}
