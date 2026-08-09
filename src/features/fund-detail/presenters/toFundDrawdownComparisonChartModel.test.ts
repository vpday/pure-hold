import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDrawdownComparisonResult } from '../models/fundDrawdownComparison.ts'
import { toFundDrawdownComparisonChartModel } from './toFundDrawdownComparisonChartModel.ts'

test('maps both signed drawdown series and maximum drawdown summaries', () => {
  const model = toFundDrawdownComparisonChartModel(result(), '成立来')

  assert.deepEqual(model.dates, ['2026-01-01', '2026-02-01'])
  assert.deepEqual(model.series, [
    { name: '基金回撤', values: [0, -20] },
    { name: '沪深300全收益回撤', values: [0, -10] },
  ])
  assert.deepEqual(model.summary, [
    { label: '基金最大回撤', valueText: '20.00%' },
    { label: '沪深300全收益最大回撤', valueText: '10.00%' },
  ])
  assert.equal(model.actualRangeText, '实际区间 2026-01-01 至 2026-02-01')
})

test('uses placeholders and a stable empty state for insufficient data', () => {
  const model = toFundDrawdownComparisonChartModel(
    {
      ...result(),
      benchmarkMaximumDrawdown: null,
      commonCutoffDate: null,
      fundMaximumDrawdown: null,
      points: [],
      startDate: null,
      status: 'insufficient-data',
    },
    '近1年',
  )

  assert.equal(model.emptyText, '所选范围内可比数据不足')
  assert.deepEqual(
    model.summary.map(({ valueText }) => valueText),
    ['--', '--'],
  )
})

function result(): FundDrawdownComparisonResult {
  return {
    benchmarkMaximumDrawdown: -0.1,
    benchmarkName: '沪深300全收益指数',
    commonCutoffDate: '2026-02-01',
    fundMaximumDrawdown: -0.2,
    points: [
      { benchmarkDrawdown: 0, date: '2026-01-01', fundDrawdown: 0 },
      { benchmarkDrawdown: -0.1, date: '2026-02-01', fundDrawdown: -0.2 },
    ],
    sourceIssues: { benchmark: [], fund: [] },
    startDate: '2026-01-01',
    status: 'ready',
  }
}
