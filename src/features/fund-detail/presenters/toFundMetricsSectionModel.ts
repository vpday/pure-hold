import type {
  FundMetricComparisonValue,
  FundMetricsComparison,
} from '../models/fundMetricsComparison.ts'
import type {
  FundMetricComparisonRowModel,
  FundMetricsSectionModel,
  FundMetricValueModel,
} from '../models/fundMetricsSectionModel.ts'

const periodLabels = [
  ['oneWeek', '近1周'],
  ['oneMonth', '近1月'],
  ['threeMonths', '近3月'],
  ['sixMonths', '近6月'],
  ['yearToDate', '今年来'],
  ['oneYear', '近1年'],
  ['twoYears', '近2年'],
  ['threeYears', '近3年'],
  ['fiveYears', '近5年'],
  ['sinceInception', '成立来'],
] as const

const annualizedLabels = [
  ['oneYear', '近1年'],
  ['twoYears', '近2年'],
  ['threeYears', '近3年'],
  ['fiveYears', '近5年'],
  ['sinceInception', '成立来'],
] as const

export function toFundMetricsSectionModel(
  comparison: FundMetricsComparison,
): FundMetricsSectionModel {
  return {
    annualized: annualizedLabels.map(([key, label]) =>
      comparisonRow(key, label, comparison.annualized[key]),
    ),
    annualReturns: comparison.annualReturns.map((value) =>
      comparisonRow(String(value.year), `${value.year}年`, value),
    ),
    cutoffText: `基金与基准共同截至 ${comparison.commonCutoffDate}`,
    periods: periodLabels.map(([key, label]) => comparisonRow(key, label, comparison.periods[key])),
    quarterlyReturns: comparison.quarterlyReturns.map((value) =>
      comparisonRow(
        `${value.year}-Q${value.quarter}`,
        `${value.year}年${value.quarter}季度`,
        value,
      ),
    ),
  }
}

function comparisonRow(
  key: string,
  label: string,
  value: FundMetricComparisonValue,
): FundMetricComparisonRowModel {
  return {
    benchmark: metricValue(value.benchmark),
    excess: metricValue(value.excess),
    fund: metricValue(value.fund),
    key,
    label,
  }
}

function metricValue(value: number | null): FundMetricValueModel {
  if (value === null || !Number.isFinite(value)) return { text: '--', trend: 'unknown' }
  if (value === 0) return { text: '0.00%', trend: 'flat' }
  return {
    text: `${value > 0 ? '+' : ''}${(value * 100).toFixed(2)}%`,
    trend: value > 0 ? 'up' : 'down',
  }
}
