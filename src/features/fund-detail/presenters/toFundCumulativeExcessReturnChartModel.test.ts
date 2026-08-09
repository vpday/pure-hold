import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundCumulativeExcessReturnResult } from '../models/fundCumulativeExcessReturn.ts'
import { toFundCumulativeExcessReturnChartModel } from './toFundCumulativeExcessReturnChartModel.ts'

test('maps one percentage series, three signed summaries and the actual common period', () => {
  const model = toFundCumulativeExcessReturnChartModel(result(0.08, 0.05, 1.08 / 1.05 - 1), '近1月')

  assert.deepEqual(model.dates, ['2026-07-10', '2026-08-07'])
  assert.deepEqual(model.series, {
    name: '累计超额收益',
    values: [0, (1.08 / 1.05 - 1) * 100],
  })
  assert.deepEqual(model.summary, [
    { color: 'fund', label: '基金累计收益', trend: 'neutral', valueText: '+8.00%' },
    {
      color: 'benchmark',
      label: '沪深300全收益',
      trend: 'neutral',
      valueText: '+5.00%',
    },
    {
      color: 'excess',
      label: '累计超额收益',
      trend: 'up',
      valueText: '+2.86%',
    },
  ])
  assert.equal(model.actualRangeText, '实际区间 2026-07-10 至 2026-08-07')
  assert.equal(model.commonCutoffText, '共同截至 2026-08-07')
  assert.equal(model.rangeLabel, '近1月')
})

test('uses down and neutral excess trends while preserving explicit signs', () => {
  const down = toFundCumulativeExcessReturnChartModel(result(-0.02, 0.01, -0.03), '近6月')
  assert.equal(down.summary[0].valueText, '-2.00%')
  assert.equal(down.summary[2].trend, 'down')

  const neutral = toFundCumulativeExcessReturnChartModel(result(0, 0, 0), '近6月')
  assert.equal(neutral.summary[2].valueText, '+0.00%')
  assert.equal(neutral.summary[2].trend, 'neutral')
})

test('presents insufficient data without inventing a zero curve', () => {
  const empty: FundCumulativeExcessReturnResult = {
    benchmarkName: '沪深300全收益指数',
    benchmarkReturn: null,
    commonCutoffDate: null,
    fundReturn: null,
    points: [],
    excessReturn: null,
    sourceIssues: { benchmark: [], fund: [] },
    startDate: null,
    status: 'insufficient-data',
  }

  const model = toFundCumulativeExcessReturnChartModel(empty, '成立来')

  assert.deepEqual(model.dates, [])
  assert.deepEqual(model.series.values, [])
  assert.equal(model.emptyText, '所选范围内可比数据不足')
  assert.deepEqual(
    model.summary.map(({ valueText }) => valueText),
    ['--', '--', '--'],
  )
})

function result(
  fundReturn: number,
  benchmarkReturn: number,
  excessReturn: number,
): FundCumulativeExcessReturnResult {
  return {
    benchmarkName: '沪深300全收益指数',
    benchmarkReturn,
    commonCutoffDate: '2026-08-07',
    fundReturn,
    points: [
      { benchmarkReturn: 0, date: '2026-07-10', excessReturn: 0, fundReturn: 0 },
      {
        benchmarkReturn,
        date: '2026-08-07',
        fundReturn,
        excessReturn,
      },
    ],
    excessReturn,
    sourceIssues: { benchmark: [], fund: [] },
    startDate: '2026-07-10',
    status: 'ready',
  }
}
