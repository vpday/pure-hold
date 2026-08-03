import type { FundAssetAllocation } from '@/domains/funds/models/fundAssetAllocation.ts'
import type { FundAssetAllocationChartModel } from '../models/fundAssetAllocationChart.ts'

export function toFundAssetAllocationChartModel(
  allocation: FundAssetAllocation,
): FundAssetAllocationChartModel {
  return {
    dates: allocation.points.map(({ date }) => date),
    series: [
      {
        name: '股票占净值比',
        values: allocation.points.map(({ stockPercent }) => stockPercent),
      },
      {
        name: '债券占净值比',
        values: allocation.points.map(({ bondPercent }) => bondPercent),
      },
      {
        name: '现金占净值比',
        values: allocation.points.map(({ cashPercent }) => cashPercent),
      },
      {
        name: '资产净值',
        values: allocation.points.map(({ netAssetValue }) => netAssetValue),
      },
    ],
  }
}
