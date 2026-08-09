import type { FundDrawdownComparisonResult } from '../models/fundDrawdownComparison.ts'
import type { FundDrawdownComparisonChartModel } from '../models/fundDrawdownComparisonChart.ts'

export function toFundDrawdownComparisonChartModel(
  result: FundDrawdownComparisonResult,
  rangeLabel: string,
): FundDrawdownComparisonChartModel {
  return {
    actualRangeText:
      result.startDate && result.commonCutoffDate
        ? `实际区间 ${result.startDate} 至 ${result.commonCutoffDate}`
        : '',
    commonCutoffText: result.commonCutoffDate ? `共同截至 ${result.commonCutoffDate}` : '',
    dates: result.points.map(({ date }) => date),
    emptyText: result.status === 'insufficient-data' ? '所选范围内可比数据不足' : '',
    rangeLabel,
    series: [
      {
        name: '基金回撤',
        values: result.points.map(({ fundDrawdown }) => fundDrawdown * 100),
      },
      {
        name: '沪深300全收益回撤',
        values: result.points.map(({ benchmarkDrawdown }) => benchmarkDrawdown * 100),
      },
    ],
    summary: [
      { label: '基金最大回撤', valueText: formatPercent(result.fundMaximumDrawdown) },
      {
        label: '沪深300全收益最大回撤',
        valueText: formatPercent(result.benchmarkMaximumDrawdown),
      },
    ],
  }
}

function formatPercent(value: number | null): string {
  return value === null ? '--' : `${Math.abs(value * 100).toFixed(2)}%`
}
