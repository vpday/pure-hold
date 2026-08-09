export interface FundDrawdownComparisonChartSeries {
  readonly name: '基金回撤' | '沪深300全收益回撤'
  readonly values: readonly number[]
}

export interface FundDrawdownComparisonSummaryItem {
  readonly label: '基金最大回撤' | '沪深300全收益最大回撤'
  readonly valueText: string
}

export interface FundDrawdownComparisonChartModel {
  readonly actualRangeText: string
  readonly commonCutoffText: string
  readonly dates: readonly string[]
  readonly emptyText: string
  readonly rangeLabel: string
  readonly series: readonly [FundDrawdownComparisonChartSeries, FundDrawdownComparisonChartSeries]
  readonly summary: readonly [FundDrawdownComparisonSummaryItem, FundDrawdownComparisonSummaryItem]
}
