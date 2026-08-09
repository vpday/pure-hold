import type { FundRelativeBenchmarkResult } from '../models/fundRelativeBenchmark.ts'
import type {
  FundRelativeBenchmarkChartModel,
  FundRelativeBenchmarkSummaryTrend,
} from '../models/fundRelativeBenchmarkChart.ts'

export function toFundRelativeBenchmarkChartModel(
  result: FundRelativeBenchmarkResult,
  rangeLabel: string,
): FundRelativeBenchmarkChartModel {
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
      values: result.points.map(({ relativeReturn }) => relativeReturn * 100),
    },
    summary: [
      {
        color: 'fund',
        label: '基金累计收益',
        trend: 'neutral',
        valueText: formatSignedPercent(result.fundReturn),
      },
      {
        color: 'benchmark',
        label: '沪深300全收益',
        trend: 'neutral',
        valueText: formatSignedPercent(result.benchmarkReturn),
      },
      {
        color: 'relative',
        label: '累计超额收益',
        trend: toTrend(result.relativeReturn),
        valueText: formatSignedPercent(result.relativeReturn),
      },
    ],
  }
}

function formatSignedPercent(value: number | null): string {
  if (value === null) return '--'
  const percent = value * 100
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
}

function toTrend(value: number | null): FundRelativeBenchmarkSummaryTrend {
  if (value === null || value === 0) return 'neutral'
  return value > 0 ? 'up' : 'down'
}
