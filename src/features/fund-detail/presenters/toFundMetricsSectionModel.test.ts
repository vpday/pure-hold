import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundMetricsComparison } from '../models/fundMetricsComparison.ts'
import { toFundMetricsSectionModel } from './toFundMetricsSectionModel.ts'

test('formats all three returns, placeholders, trends and common cutoff date', () => {
  const model = toFundMetricsSectionModel(comparison())
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
  const model = toFundMetricsSectionModel(comparison())
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
