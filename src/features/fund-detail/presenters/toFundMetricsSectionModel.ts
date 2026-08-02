import type {
  FundReinvestedNavIssue,
  FundReinvestedNavIssueCode,
} from '@/domains/funds/models/fundReinvestedNav.ts'
import type { FundRiskQualityIssue } from '@/domains/funds/models/fundRiskMetrics.ts'
import type {
  IndexPerformanceHistoryIssue,
  IndexPerformanceHistoryIssueCode,
} from '@/domains/indices/models/indexPerformanceHistory.ts'
import type {
  FundMetricComparisonValue,
  FundMetricsComparison,
  FundRiskMetricComparisonValue,
  FundRiskMetricsComparison,
  FundRiskPeriodQuality,
} from '../models/fundMetricsComparison.ts'
import type {
  FundMetricsAlertModel,
  FundMetricComparisonRowModel,
  FundMetricsSectionModel,
  FundMetricValueModel,
  FundRiskComparisonRowModel,
  FundRiskSectionModel,
} from '../models/fundMetricsSectionModel.ts'

export interface FundMetricsQualitySource {
  readonly benchmarkIssues: readonly IndexPerformanceHistoryIssue[]
  readonly isShowingStaleData: boolean
  readonly reinvestedIssues: readonly FundReinvestedNavIssue[]
}

export interface FundMetricsSectionOptions {
  readonly quality: FundMetricsQualitySource
  readonly riskComparison?: FundRiskMetricsComparison
  readonly riskParameters?: {
    readonly parameterError: string
    readonly riskFreeRatePercent: number | null
    readonly targetRatePercent: number | null
  }
}

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

const riskPeriodLabels = [
  ['oneYear', '近1年'],
  ['twoYears', '近2年'],
  ['threeYears', '近3年'],
  ['fiveYears', '近5年'],
  ['sinceInception', '成立以来'],
] as const

const reinvestedIssueLabels: Readonly<Record<FundReinvestedNavIssueCode, string>> = {
  'duplicate-conversion': '重复折算',
  'first-date-conversion': '首日折算',
  'first-date-dividend': '首日分红',
  'invalid-conversion': '无效折算',
  'invalid-dividend': '无效分红',
  'invalid-unit-net-value': '无效单位净值',
  'unmatched-conversion-date': '无法对齐的折算',
  'unmatched-dividend-date': '无法对齐的分红',
}

export function toFundMetricsSectionModel(
  comparison: FundMetricsComparison,
  options: FundMetricsSectionOptions,
): FundMetricsSectionModel {
  return {
    alerts: metricsAlerts(comparison, options.quality),
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
    risk:
      options.riskComparison && options.riskParameters
        ? riskSectionModel(options.riskComparison, options.riskParameters)
        : undefined,
  }
}

function riskSectionModel(
  comparison: FundRiskMetricsComparison,
  parameters: {
    readonly parameterError: string
    readonly riskFreeRatePercent: number | null
    readonly targetRatePercent: number | null
  },
): FundRiskSectionModel {
  return {
    parameterError: parameters.parameterError,
    periods: riskPeriodLabels.map(([key, label]) => {
      const period = comparison.periods[key]
      return {
        alert: riskPeriodAlert(key, label, period.quality),
        key,
        label,
        rows: [
          riskRow('maximumDrawdown', '最大回撤', period.maximumDrawdown, 'percentage'),
          riskRow('annualizedVolatility', '年化波动率', period.annualizedVolatility, 'percentage'),
          riskRow('calmarRatio', '卡玛比率', period.calmarRatio, 'ratio'),
          riskRow('sharpeRatio', '夏普比率', period.sharpeRatio, 'ratio'),
          riskRow('sortinoRatio', '索提诺比率', period.sortinoRatio, 'ratio'),
        ],
      }
    }),
    riskFreeRatePercent: parameters.riskFreeRatePercent,
    targetRatePercent: parameters.targetRatePercent,
  }
}

function metricsAlerts(
  comparison: FundMetricsComparison,
  quality: FundMetricsQualitySource,
): readonly FundMetricsAlertModel[] {
  const alerts: FundMetricsAlertModel[] = []
  if (quality.isShowingStaleData) {
    alerts.push({
      key: 'stale-data',
      message: `沪深300全收益基准刷新失败，当前展示截至 ${comparison.commonCutoffDate} 的上次成功数据`,
      tone: 'warning',
    })
  }

  if (quality.reinvestedIssues.length > 0) {
    const counts = new Map<FundReinvestedNavIssueCode, number>()
    let totalCount = 0
    for (const issue of quality.reinvestedIssues) {
      counts.set(issue.code, (counts.get(issue.code) ?? 0) + issue.count)
      totalCount += issue.count
    }
    const reasons = [...counts]
      .map(([code, count]) => `${reinvestedIssueLabels[code]} ${count} 条`)
      .join('、')
    alerts.push({
      key: 'reinvested-nav-issues',
      message: `基金净值或分红折算数据已忽略 ${totalCount} 条异常（${reasons}），收益与风险指标可能存在偏差`,
      tone: 'warning',
    })
  }

  const duplicateDates = benchmarkIssueCount(quality.benchmarkIssues, 'duplicate-date')
  if (duplicateDates > 0) {
    alerts.push({
      key: 'benchmark-duplicate-dates',
      message: `沪深300全收益历史存在 ${duplicateDates} 个重复日期，已自动去重`,
      tone: 'info',
    })
  }
  const malformedRecords = benchmarkIssueCount(quality.benchmarkIssues, 'malformed-record')
  if (malformedRecords > 0) {
    alerts.push({
      key: 'benchmark-malformed-records',
      message: `沪深300全收益历史已忽略 ${malformedRecords} 条异常记录，部分指标可能不可用`,
      tone: 'warning',
    })
  }
  if (benchmarkIssueCount(quality.benchmarkIssues, 'missing-start-date') > 0) {
    alerts.push({
      key: 'benchmark-missing-start-date',
      message: '沪深300全收益历史起始数据缺失，成立以来风险指标暂不可用',
      tone: 'warning',
    })
  }
  return alerts
}

function benchmarkIssueCount(
  issues: readonly IndexPerformanceHistoryIssue[],
  code: IndexPerformanceHistoryIssueCode,
): number {
  return issues.reduce((total, issue) => total + (issue.code === code ? issue.count : 0), 0)
}

function riskPeriodAlert(
  key: string,
  label: string,
  quality: FundRiskPeriodQuality | null,
): FundMetricsAlertModel | null {
  if (!quality) return null
  if (quality.kind === 'comparison-window-too-short') {
    return {
      key: `${key}-comparison-window-too-short`,
      message: `基金成立时间较短，成立以来可比区间有效日收益观测不足${quality.minimumReturns}个，部分风险指标暂不可用`,
      tone: 'info',
    }
  }
  if (quality.kind === 'fund-history-too-short') {
    return {
      key: `${key}-history-too-short`,
      message: `该基金成立不足${quality.requiredYears}年，近${quality.requiredYears}年风险指标暂不可用`,
      tone: 'info',
    }
  }
  const reasons = [
    riskQualityReason('基金', label, quality.fundIssue),
    riskQualityReason('沪深300全收益', label, quality.benchmarkIssue),
  ].filter((reason): reason is string => reason !== null)
  return {
    key: `${key}-history-incomplete`,
    message: `${reasons.join('；')}，部分风险指标暂不可用`,
    tone: 'warning',
  }
}

function riskQualityReason(
  source: string,
  periodLabel: string,
  issue: FundRiskQualityIssue | null,
): string | null {
  if (issue === null) return null
  const prefix = `${source}${periodLabel}`
  if (issue === 'insufficient-observations') return `${prefix}有效观测数量不足`
  if (issue === 'insufficient-coverage') return `${prefix}数据覆盖率不足`
  if (issue === 'excessive-gap') return `${prefix}存在连续缺失`
  return `${prefix}源数据不完整`
}

function riskRow(
  key: string,
  label: string,
  value: FundRiskMetricComparisonValue,
  format: 'percentage' | 'ratio',
): FundRiskComparisonRowModel {
  return {
    benchmark: riskValue(value.benchmark, format, false),
    difference: riskValue(value.difference, format, true),
    fund: riskValue(value.fund, format, false),
    key,
    label,
  }
}

function riskValue(
  value: number | null,
  format: 'percentage' | 'ratio',
  difference: boolean,
): FundMetricValueModel {
  if (value === null || !Number.isFinite(value)) return { text: '--', trend: 'unknown' }
  const number = format === 'percentage' ? value * 100 : value
  const sign = difference && number > 0 ? '+' : ''
  return {
    text: `${sign}${number.toFixed(2)}${format === 'percentage' ? (difference ? '个百分点' : '%') : ''}`,
    trend: 'flat',
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
