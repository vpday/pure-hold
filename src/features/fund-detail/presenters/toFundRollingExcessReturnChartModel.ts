import type { FundRollingExcessReturnResult } from '../models/fundRollingExcessReturn.ts'
import type {
  FundRollingExcessReturnChartModel,
  FundRollingExcessReturnSummaryTrend,
} from '../models/fundRollingExcessReturnChart.ts'

export function toFundRollingExcessReturnChartModel(
  result: FundRollingExcessReturnResult,
  rangeLabel: string,
): FundRollingExcessReturnChartModel {
  const latest = result.points.at(-1)
  return {
    actualRangeText:
      result.startDate && result.commonCutoffDate
        ? `实际区间 ${result.startDate} 至 ${result.commonCutoffDate}`
        : '',
    benchmarkValues: result.points.map(
      ({ benchmarkTrailingTwelveMonthReturn }) => benchmarkTrailingTwelveMonthReturn * 100,
    ),
    commonCutoffText: result.commonCutoffDate ? `共同截至 ${result.commonCutoffDate}` : '',
    dates: result.points.map(({ date }) => date),
    emptyText: result.status === 'insufficient-data' ? '暂无滚动12个月超额收益数据' : '',
    fundValues: result.points.map(
      ({ fundTrailingTwelveMonthReturn }) => fundTrailingTwelveMonthReturn * 100,
    ),
    rangeLabel,
    series: {
      name: '滚动12个月超额收益',
      values: result.points.map(({ excessReturn }) => excessReturn * 100),
    },
    summary: [
      {
        color: 'fund',
        label: '基金近12月收益',
        trend: toTrend(latest?.fundTrailingTwelveMonthReturn),
        valueText: formatSignedPercent(latest?.fundTrailingTwelveMonthReturn),
      },
      {
        color: 'benchmark',
        label: '沪深300全收益近12月收益',
        trend: toTrend(latest?.benchmarkTrailingTwelveMonthReturn),
        valueText: formatSignedPercent(latest?.benchmarkTrailingTwelveMonthReturn),
      },
      {
        color: 'excess',
        label: '滚动12个月超额收益',
        trend: toTrend(latest?.excessReturn),
        valueText: formatSignedPercent(latest?.excessReturn),
      },
    ],
  }
}

function formatSignedPercent(value: number | undefined): string {
  if (value === undefined) return '--'
  const percent = value * 100
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
}

function toTrend(value: number | undefined): FundRollingExcessReturnSummaryTrend {
  if (value === undefined || value === 0) return 'neutral'
  return value > 0 ? 'up' : 'down'
}
