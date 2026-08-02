import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  FundMetricsComparison,
  FundRiskMetricComparisonValue,
  FundRiskMetricsComparison,
} from '../models/fundMetricsComparison.ts'
import type { FundMetricsQualitySource } from './toFundMetricsSectionModel.ts'
import { toFundMetricsSectionModel } from './toFundMetricsSectionModel.ts'

test('formats all three returns, placeholders, trends and common cutoff date', () => {
  const model = toFundMetricsSectionModel(comparison(), { quality: emptyQuality() })
  assert.deepEqual(model.periods[0], {
    benchmark: { text: '-6.62%', trend: 'down' },
    excess: { text: '0.00%', trend: 'flat' },
    fund: { text: '+8.29%', trend: 'up' },
    key: 'oneWeek',
    label: '近1周',
  })
  assert.equal(model.periods.at(-1)?.benchmark.text, '--')
  assert.equal(model.periods.at(-1)?.excess.text, '--')
  assert.equal(model.cutoffText, '基金与基准共同截至 2026-07-31')
})

test('preserves descending quarter and annual rows with time on the row axis', () => {
  const model = toFundMetricsSectionModel(comparison(), { quality: emptyQuality() })
  assert.deepEqual(
    model.quarterlyReturns.map(({ key, label }) => ({ key, label })),
    [
      { key: '2026-Q2', label: '2026年2季度' },
      { key: '2026-Q1', label: '2026年1季度' },
    ],
  )
  assert.equal(model.quarterlyReturns[0]?.fund.text, '+1.00%')
  assert.equal(model.quarterlyReturns[0]?.benchmark.text, '--')
  assert.deepEqual(
    model.annualReturns.map(({ label }) => label),
    ['2025年', '2024年'],
  )
})

test('formats risk periods, units, explicit differences, placeholders and neutral trends', () => {
  const model = toFundMetricsSectionModel(comparison(), {
    quality: emptyQuality(),
    riskComparison: riskComparison(),
    riskParameters: {
      parameterError: '参数错误',
      riskFreeRatePercent: 1.15,
      targetRatePercent: 4,
    },
  })
  const risk = model.risk
  assert.ok(risk)
  assert.deepEqual(
    risk.periods.map(({ key, label }) => ({ key, label })),
    [
      { key: 'oneYear', label: '近1年' },
      { key: 'twoYears', label: '近2年' },
      { key: 'threeYears', label: '近3年' },
      { key: 'fiveYears', label: '近5年' },
      { key: 'sinceInception', label: '成立以来' },
    ],
  )
  assert.equal(risk.parameterError, '参数错误')
  assert.equal(risk.riskFreeRatePercent, 1.15)
  assert.equal(risk.targetRatePercent, 4)
  assert.deepEqual(
    risk.periods[0]?.rows.map(({ label }) => label),
    ['最大回撤', '年化波动率', '卡玛比率', '夏普比率', '索提诺比率'],
  )
  assert.deepEqual(risk.periods[0]?.rows[0], {
    benchmark: { text: '5.00%', trend: 'flat' },
    difference: { text: '+1.25个百分点', trend: 'flat' },
    fund: { text: '6.25%', trend: 'flat' },
    key: 'maximumDrawdown',
    label: '最大回撤',
  })
  assert.equal(risk.periods[0]?.rows[1]?.difference.text, '-0.80个百分点')
  assert.equal(risk.periods[0]?.rows[2]?.difference.text, '+0.40')
  assert.equal(risk.periods[0]?.rows[3]?.difference.text, '0.00')
  assert.equal(risk.periods[0]?.rows[4]?.fund.text, '--')
  assert.equal(risk.periods[0]?.rows[4]?.fund.trend, 'unknown')
  assert.deepEqual(risk.periods[1]?.alert, {
    key: 'twoYears-history-incomplete',
    message: '基金近2年数据覆盖率不足，部分风险指标暂不可用',
    tone: 'warning',
  })
})

test('presents persistent source quality issues as section alerts', () => {
  const model = toFundMetricsSectionModel(comparison(), {
    quality: {
      benchmarkIssues: [
        { code: 'duplicate-date', count: 2 },
        { code: 'malformed-record', count: 3 },
        { code: 'missing-start-date', count: 1 },
      ],
      isShowingStaleData: true,
      reinvestedIssues: [{ code: 'invalid-unit-net-value', count: 1, date: '2026-01-02' }],
    },
  })

  assert.deepEqual(
    model.alerts.map(({ key, tone }) => ({ key, tone })),
    [
      { key: 'stale-data', tone: 'warning' },
      { key: 'reinvested-nav-issues', tone: 'warning' },
      { key: 'benchmark-duplicate-dates', tone: 'info' },
      { key: 'benchmark-malformed-records', tone: 'warning' },
      { key: 'benchmark-missing-start-date', tone: 'warning' },
    ],
  )
  assert.match(model.alerts[0]?.message ?? '', /截至 2026-07-31 的上次成功数据/)
})

test('presents a young fund risk period as information instead of incomplete history', () => {
  const baseRiskComparison = riskComparison()
  const comparisonWithYoungFund: FundRiskMetricsComparison = {
    periods: {
      ...baseRiskComparison.periods,
      fiveYears: {
        ...baseRiskComparison.periods.fiveYears,
        quality: { kind: 'fund-history-too-short', requiredYears: 5 },
      },
    },
  }
  const model = toFundMetricsSectionModel(comparison(), {
    quality: emptyQuality(),
    riskComparison: comparisonWithYoungFund,
    riskParameters: {
      parameterError: '',
      riskFreeRatePercent: 1.15,
      targetRatePercent: 4,
    },
  })

  assert.deepEqual(model.risk?.periods[3]?.alert, {
    key: 'fiveYears-history-too-short',
    message: '该基金成立不足5年，近5年风险指标暂不可用',
    tone: 'info',
  })
})

test('presents a short inception comparison window without blaming the benchmark', () => {
  const baseRiskComparison = riskComparison()
  const shortWindowComparison: FundRiskMetricsComparison = {
    periods: {
      ...baseRiskComparison.periods,
      sinceInception: {
        ...baseRiskComparison.periods.sinceInception,
        quality: { kind: 'comparison-window-too-short', minimumReturns: 200 },
      },
    },
  }
  const model = toFundMetricsSectionModel(comparison(), {
    quality: emptyQuality(),
    riskComparison: shortWindowComparison,
    riskParameters: {
      parameterError: '',
      riskFreeRatePercent: 1.15,
      targetRatePercent: 4,
    },
  })

  assert.deepEqual(model.risk?.periods[4]?.alert, {
    key: 'sinceInception-comparison-window-too-short',
    message: '基金成立时间较短，成立以来可比区间有效日收益观测不足200个，部分风险指标暂不可用',
    tone: 'info',
  })
})

function comparison(): FundMetricsComparison {
  const unavailable = value(null, null, null)
  return {
    annualized: {
      fiveYears: unavailable,
      oneYear: value(0.0829, -0.0662, 0.16),
      sinceInception: value(0, null, null),
      threeYears: value(-0.0662, 0.0829, -0.13),
      twoYears: unavailable,
    },
    annualReturns: [
      { ...value(-0.02, 0.01, -0.0297), year: 2025 },
      { ...value(0.01, 0, 0.01), year: 2024 },
    ],
    commonCutoffDate: '2026-07-31',
    periods: {
      fiveYears: unavailable,
      oneMonth: unavailable,
      oneWeek: value(0.0829, -0.0662, 0),
      oneYear: unavailable,
      sinceInception: value(0.2, null, null),
      sixMonths: unavailable,
      threeMonths: unavailable,
      threeYears: unavailable,
      twoYears: unavailable,
      yearToDate: unavailable,
    },
    quarterlyReturns: [
      { ...value(0.01, null, null), quarter: 2, year: 2026 },
      { ...value(-0.01, 0.02, -0.0294), quarter: 1, year: 2026 },
    ],
  }
}

function value(fund: number | null, benchmark: number | null, excess: number | null) {
  return { benchmark, excess, fund }
}

function riskComparison(): FundRiskMetricsComparison {
  const complete = {
    annualizedVolatility: riskValue(0.1, 0.108, -0.008),
    calmarRatio: riskValue(1.2, 0.8, 0.4),
    maximumDrawdown: riskValue(0.0625, 0.05, 0.0125),
    quality: null,
    sharpeRatio: riskValue(0.5, 0.5, 0),
    sortinoRatio: riskValue(null, 0.7, null),
  }
  return {
    periods: {
      fiveYears: complete,
      oneYear: complete,
      sinceInception: complete,
      threeYears: complete,
      twoYears: {
        ...complete,
        quality: {
          benchmarkIssue: null,
          fundIssue: 'insufficient-coverage',
          kind: 'history-incomplete',
        },
      },
    },
  }
}

function emptyQuality(): FundMetricsQualitySource {
  return { benchmarkIssues: [], isShowingStaleData: false, reinvestedIssues: [] }
}

function riskValue(
  fund: number | null,
  benchmark: number | null,
  difference: number | null,
): FundRiskMetricComparisonValue {
  return { benchmark, difference, fund }
}
