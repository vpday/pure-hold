export type FundAssetAllocationChartSeriesName =
  | '股票占净值比'
  | '债券占净值比'
  | '现金占净值比'
  | '资产净值'

export interface FundAssetAllocationChartSeries {
  readonly name: FundAssetAllocationChartSeriesName
  readonly values: readonly (number | null)[]
}

export interface FundAssetAllocationChartModel {
  readonly dates: readonly string[]
  readonly series: readonly [
    FundAssetAllocationChartSeries,
    FundAssetAllocationChartSeries,
    FundAssetAllocationChartSeries,
    FundAssetAllocationChartSeries,
  ]
}
