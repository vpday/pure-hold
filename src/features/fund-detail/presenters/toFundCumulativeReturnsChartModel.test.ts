import assert from 'node:assert/strict'
import test from 'node:test'

import { toFundCumulativeReturnsChartModel } from './toFundCumulativeReturnsChartModel.ts'

test('maps cumulative returns to three named chart series without filling holes', () => {
  assert.deepEqual(
    toFundCumulativeReturnsChartModel(
      {
        fundCode: '161725',
        maximumDrawdownPercent: 67.9365,
        referenceIndexCode: '399997',
        range: 'ln',
        points: [
          {
            date: '2016-12-03',
            fundTypeYieldPercent: null,
            fundYieldPercent: null,
            referenceIndexYieldPercent: null,
          },
          {
            date: '2026-07-29',
            fundTypeYieldPercent: 8.99,
            fundYieldPercent: 127.43,
            referenceIndexYieldPercent: 104.35,
          },
        ],
      },
      '中证白酒指数',
      '成立来',
    ),
    {
      dates: ['2016-12-03', '2026-07-29'],
      series: [
        { name: '基金累计收益', values: [null, 127.43] },
        { name: '中证白酒指数', values: [null, 104.35] },
        { name: '同类基金收益', values: [null, 8.99] },
      ],
      summary: [
        { color: 'fund', label: '成立来', valueText: '127.43%' },
        { color: 'peer', label: '同类平均', valueText: '8.99%' },
        { color: 'reference', label: '中证白酒指数', valueText: '104.35%' },
        { color: 'drawdown', label: '最大回撤', valueText: '67.94%' },
      ],
    },
  )
})

test('uses the latest date point and placeholders for missing summary values', () => {
  const model = toFundCumulativeReturnsChartModel(
    {
      fundCode: '161725',
      maximumDrawdownPercent: null,
      referenceIndexCode: '399997',
      range: 'y',
      points: [
        {
          date: '2026-07-28',
          fundTypeYieldPercent: 1,
          fundYieldPercent: 2,
          referenceIndexYieldPercent: 3,
        },
        {
          date: '2026-07-29',
          fundTypeYieldPercent: null,
          fundYieldPercent: -4,
          referenceIndexYieldPercent: 0,
        },
      ],
    },
    '中证白酒指数',
    '近1月',
  )

  assert.deepEqual(
    model.summary.map(({ valueText }) => valueText),
    ['-4.00%', '--', '0.00%', '5.88%'],
  )
  assert.deepEqual(model.drawdown, {
    peakIndex: 0,
    troughIndex: 1,
  })
})

test('uses the provider drawdown value with the calculated peak and trough', () => {
  const model = toFundCumulativeReturnsChartModel(
    {
      fundCode: '161725',
      maximumDrawdownPercent: 7.5,
      referenceIndexCode: '399997',
      range: '6y',
      points: [
        {
          date: '2026-01-01',
          fundTypeYieldPercent: 0,
          fundYieldPercent: 0,
          referenceIndexYieldPercent: 0,
        },
        {
          date: '2026-01-02',
          fundTypeYieldPercent: 8,
          fundYieldPercent: 10,
          referenceIndexYieldPercent: 6,
        },
        {
          date: '2026-01-03',
          fundTypeYieldPercent: 3,
          fundYieldPercent: 2,
          referenceIndexYieldPercent: 4,
        },
        {
          date: '2026-01-04',
          fundTypeYieldPercent: 9,
          fundYieldPercent: 10,
          referenceIndexYieldPercent: 7,
        },
      ],
    },
    '中证白酒指数',
    '近6月',
  )

  assert.deepEqual(model.drawdown, {
    peakIndex: 1,
    troughIndex: 2,
  })
  assert.equal(model.summary[3].valueText, '7.50%')
})
