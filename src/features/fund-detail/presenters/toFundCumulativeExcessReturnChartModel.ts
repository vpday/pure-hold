import type { FundCumulativeExcessReturnResult } from '../models/fundCumulativeExcessReturn.ts'
import type {
  FundCumulativeExcessReturnChartModel,
  FundCumulativeExcessReturnSummaryTrend,
} from '../models/fundCumulativeExcessReturnChart.ts'

export function toFundCumulativeExcessReturnChartModel(
  result: FundCumulativeExcessReturnResult,
  rangeLabel: string,
): FundCumulativeExcessReturnChartModel {
  return {
    actualRangeText:
      result.startDate && result.commonCutoffDate
        ? `实际区间 ${result.startDate} 至 ${result.commonCutoffDate}`
        : '',
    commonCutoffText: result.commonCutoffDate ? `共同截至 ${result.commonCutoffDate}` : '',
    dates: result.points.map(({ date }) => date),
    emptyText: result.status === 'insufficient-data' ? '所选范围内可比数据不足' : '',
    rangeLabel,
    series: {
      name: '累计超额收益',
      values: result.points.map(({ excessReturn }) => excessReturn * 100),
    },
    summary: [
      {
        color: 'fund',
        label: '基金累计收益',
        trend: toTrend(result.fundReturn),
        valueText: formatSignedPercent(result.fundReturn),
      },
      {
        color: 'benchmark',
        label: '沪深300全收益',
        trend: toTrend(result.benchmarkReturn),
        valueText: formatSignedPercent(result.benchmarkReturn),
      },
      {
        color: 'excess',
        label: '累计超额收益',
        trend: toTrend(result.excessReturn),
        valueText: formatSignedPercent(result.excessReturn),
      },
    ],
  }
}

function formatSignedPercent(value: number | null): string {
  if (value === null) return '--'
  const percent = value * 100
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
}

function toTrend(value: number | null): FundCumulativeExcessReturnSummaryTrend {
  if (value === null || value === 0) return 'neutral'
  return value > 0 ? 'up' : 'down'
}
