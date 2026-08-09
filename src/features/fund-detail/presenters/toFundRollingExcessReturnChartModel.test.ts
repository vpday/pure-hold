import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundRollingExcessReturnResult } from '../models/fundRollingExcessReturn.ts'
import { toFundRollingExcessReturnChartModel } from './toFundRollingExcessReturnChartModel.ts'

test('maps the rolling series, tooltip values and ordered latest summaries', () => {
  const model = toFundRollingExcessReturnChartModel(result(), '近1年')

  assert.deepEqual(model.dates, ['2026-05-29', '2026-06-30'])
  assert.deepEqual(model.fundValues, [5, 20])
  assert.deepEqual(model.benchmarkValues, [6, 10])
  assert.deepEqual(model.series, {
    name: '滚动12个月超额收益',
    values: [-1, (1.2 / 1.1 - 1) * 100],
  })
  assert.deepEqual(model.summary, [
    { color: 'fund', label: '基金近12月收益', trend: 'up', valueText: '+20.00%' },
    {
      color: 'benchmark',
      label: '沪深300全收益近12月收益',
      trend: 'up',
      valueText: '+10.00%',
    },
    {
      color: 'excess',
      label: '滚动12个月超额收益',
      trend: 'up',
      valueText: '+9.09%',
    },
  ])
  assert.equal(model.actualRangeText, '实际区间 2026-05-29 至 2026-06-30')
  assert.equal(model.commonCutoffText, '共同截至 2026-06-30')
})

test('formats negative and zero values with explicit signs and semantic trends', () => {
  const source = result()
  const model = toFundRollingExcessReturnChartModel(
    {
      ...source,
      points: [
        {
          benchmarkTrailingTwelveMonthReturn: 0,
          date: '2026-06-30',
          excessReturn: -0.02,
          fundTrailingTwelveMonthReturn: -0.02,
        },
      ],
    },
    '近1年',
  )

  assert.equal(model.summary[0].valueText, '-2.00%')
  assert.equal(model.summary[0].trend, 'down')
  assert.equal(model.summary[1].valueText, '+0.00%')
  assert.equal(model.summary[1].trend, 'neutral')
})

test('presents insufficient data without inventing values', () => {
  const model = toFundRollingExcessReturnChartModel(
    {
      benchmarkName: '沪深300全收益指数',
      commonCutoffDate: null,
      points: [],
      sourceIssues: { benchmark: [], fund: [] },
      startDate: null,
      status: 'insufficient-data',
    },
    '成立来',
  )

  assert.deepEqual(model.dates, [])
  assert.deepEqual(model.series.values, [])
  assert.deepEqual(model.fundValues, [])
  assert.deepEqual(model.benchmarkValues, [])
  assert.equal(model.emptyText, '暂无滚动12个月超额收益数据')
  assert.deepEqual(
    model.summary.map(({ valueText }) => valueText),
    ['--', '--', '--'],
  )
})

function result(): FundRollingExcessReturnResult {
  return {
    benchmarkName: '沪深300全收益指数',
    commonCutoffDate: '2026-06-30',
    points: [
      {
        benchmarkTrailingTwelveMonthReturn: 0.06,
        date: '2026-05-29',
        excessReturn: -0.01,
        fundTrailingTwelveMonthReturn: 0.05,
      },
      {
        benchmarkTrailingTwelveMonthReturn: 0.1,
        date: '2026-06-30',
        excessReturn: 1.2 / 1.1 - 1,
        fundTrailingTwelveMonthReturn: 0.2,
      },
    ],
    sourceIssues: { benchmark: [], fund: [] },
    startDate: '2026-05-29',
    status: 'ready',
  }
}
