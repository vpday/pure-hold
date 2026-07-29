import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFundPerformanceChartOption } from './buildFundPerformanceChartOption.ts'

test('builds a three-line percentage option that preserves null gaps', () => {
  const option = buildFundPerformanceChartOption({
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
  })
  const series = option.series as readonly {
    readonly connectNulls: boolean
    readonly data: readonly (number | null)[]
  }[]

  assert.equal(series.length, 3)
  assert.deepEqual(series[0]?.data, [null, 127.43])
  assert.ok(series.every(({ connectNulls }) => connectNulls === false))
  assert.equal('markPoint' in (series[0] ?? {}), false)
  assert.equal('markLine' in (series[0] ?? {}), false)
  assert.deepEqual(option.legend, {
    data: ['基金累计收益', '中证白酒指数', '同类基金收益'],
    right: 0,
    show: true,
    top: 0,
    type: 'scroll',
  })
})

test('does not render the ECharts legend in the mobile layout', () => {
  const option = buildFundPerformanceChartOption(
    {
      dates: [],
      series: [
        { name: '基金累计收益', values: [] },
        { name: '上证指数', values: [] },
        { name: '同类基金收益', values: [] },
      ],
      summary: [
        { color: 'fund', label: '近1月', valueText: '--' },
        { color: 'peer', label: '同类平均', valueText: '--' },
        { color: 'reference', label: '上证指数', valueText: '--' },
        { color: 'drawdown', label: '最大回撤', valueText: '--' },
      ],
    },
    [],
    false,
  )

  assert.equal((option.legend as { show: boolean }).show, false)
  assert.equal((option.grid as { top: number }).top, 16)
})

test('formats tooltip values with date, explicit signs and percentages', () => {
  const option = buildFundPerformanceChartOption({
    dates: ['2026-07-29'],
    series: [
      { name: '基金累计收益', values: [1.2] },
      { name: '上证指数', values: [-2] },
      { name: '同类基金收益', values: [0] },
    ],
    summary: [
      { color: 'fund', label: '近1月', valueText: '1.20%' },
      { color: 'peer', label: '同类平均', valueText: '0.00%' },
      { color: 'reference', label: '上证指数', valueText: '-2.00%' },
      { color: 'drawdown', label: '最大回撤', valueText: '3.00%' },
    ],
  })
  const formatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter
  const text = formatter([
    { axisValue: '2026-07-29', marker: '●', seriesName: '基金累计收益', value: 1.2 },
    { axisValue: '2026-07-29', marker: '●', seriesName: '上证指数', value: -2 },
    { axisValue: '2026-07-29', marker: '●', seriesName: '同类基金收益', value: 0 },
  ])

  assert.match(text, /2026-07-29/)
  assert.match(text, /\+1\.20%/)
  assert.match(text, /-2\.00%/)
  assert.match(text, /0\.00%/)
})
