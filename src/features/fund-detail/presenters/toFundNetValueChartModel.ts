import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import type { FundNetValueChartModel, FundNetValueView } from '../models/fundNetValueChart.ts'

export function toFundNetValueChartModel(
  history: FundNetValueHistory,
  view: FundNetValueView,
): FundNetValueChartModel {
  return {
    dailyGrowthPercents: history.points.map(({ dailyGrowthPercent }) => dailyGrowthPercent),
    dates: history.points.map(({ date }) => date),
    name: view === 'unit-net-value' ? '单位净值' : '累计净值',
    values: history.points.map((point) =>
      view === 'unit-net-value' ? point.unitNetValue : point.cumulativeNetValue,
    ),
  }
}
