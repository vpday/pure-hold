import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundPerformanceChartModel } from '../models/fundPerformance.ts'
import { buildFundPerformanceChartOption } from './buildFundPerformanceChartOption.ts'

test('builds a three-line percentage option that preserves null gaps', () => {
  const colors = ['red', 'blue', 'gray'] as const
  const option = buildFundPerformanceChartOption(
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
    {
      theme: {
        annotation: 'darkgray',
        fundLine: colors[0],
        peerLine: colors[2],
        referenceLine: colors[1],
      },
    },
  )
  const series = option.series as readonly {
    readonly connectNulls: boolean
    readonly data: readonly (number | null)[]
    readonly itemStyle: { readonly color: string }
    readonly lineStyle: { readonly color: string }
    readonly markPoint?: {
      readonly data: readonly { readonly name: string; readonly type: string }[]
      readonly itemStyle: { readonly color: string }
      readonly label: { readonly color: string }
    }
  }[]

  assert.equal(series.length, 3)
  assert.deepEqual(series[0]?.data, [null, 127.43])
  assert.ok(series.every(({ connectNulls }) => connectNulls === false))
  assert.deepEqual(
    series.map(({ itemStyle }) => itemStyle.color),
    colors,
  )
  assert.deepEqual(
    series.map(({ lineStyle }) => lineStyle.color),
    colors,
  )
  assert.deepEqual(series[0]?.markPoint?.data, [
    { type: 'max', name: 'Max' },
    { type: 'min', name: 'Min' },
  ])
  assert.equal(series[0]?.markPoint?.itemStyle.color, 'darkgray')
  assert.equal(series[0]?.markPoint?.label.color, 'darkgray')
  assert.equal(series[1]?.markPoint, undefined)
  assert.equal(series[2]?.markPoint, undefined)
  assert.equal('markLine' in (series[0] ?? {}), false)
  assert.deepEqual(option.legend, {
    data: ['基金累计收益', '中证白酒指数', '同类基金收益'],
    right: 0,
    show: true,
    top: 0,
    type: 'scroll',
  })
})

test('overlays only the maximum drawdown segment in green', () => {
  const option = buildFundPerformanceChartOption(drawdownModel(), {
    theme: {
      annotation: 'darkgray',
      drawdownLine: 'green',
      fundLine: 'red',
      peerLine: 'gray',
      referenceLine: 'blue',
    },
  })
  const series = option.series as readonly {
    readonly areaStyle?: { readonly color: string; readonly opacity: number }
    readonly data: readonly (number | null)[]
    readonly emphasis?: { readonly disabled?: boolean; readonly focus?: string }
    readonly markPoint?: {
      readonly data: readonly { readonly name: string; readonly type: string }[]
      readonly itemStyle: { readonly color: string }
      readonly label: { readonly color: string }
    }
    readonly name: string
    readonly silent?: boolean
    readonly tooltip?: { readonly show: boolean }
  }[]

  assert.equal(series.length, 4)
  assert.equal(series[1]?.markPoint, undefined)
  assert.equal(series[2]?.markPoint, undefined)
  assert.equal(series[0]?.markPoint?.itemStyle.color, 'darkgray')
  assert.equal(series[0]?.markPoint?.label.color, 'darkgray')
  assert.deepEqual(series[0]?.markPoint?.data, [
    { type: 'max', name: 'Max' },
    { type: 'min', name: 'Min' },
  ])
  assert.deepEqual(series[0]?.emphasis, { disabled: true })
  assert.deepEqual(series[1]?.emphasis, { focus: 'series' })
  assert.deepEqual(series[2]?.emphasis, { focus: 'series' })
  assert.deepEqual(series[3]?.data, [null, 10, 2, null, null])
  assert.deepEqual(series[3]?.areaStyle, { color: 'green', opacity: 0.15 })
  assert.deepEqual(series[3]?.emphasis, { disabled: true })
  assert.ok(series.every((item) => !('markArea' in item)))
  assert.equal(series[3]?.name, '')
  assert.equal(series[3]?.silent, true)
  assert.equal(series[3]?.tooltip?.show, false)
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
    { showLegend: false },
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
    { axisValue: '2026-07-29', marker: '●', seriesName: '', value: 99 },
  ])

  assert.match(text, /2026-07-29/)
  assert.match(text, /\+1\.20%/)
  assert.match(text, /-2\.00%/)
  assert.match(text, /0\.00%/)
  assert.doesNotMatch(text, /99\.00%/)
})

function drawdownModel(): FundPerformanceChartModel {
  return {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'],
    drawdown: {
      peakIndex: 1,
      troughIndex: 2,
    },
    series: [
      { name: '基金累计收益', values: [0, 10, 2, 10, 6] },
      { name: '上证指数', values: [0, 8, 4, 9, 7] },
      { name: '同类基金收益', values: [0, 7, 3, 8, 5] },
    ],
    summary: [
      { color: 'fund', label: '近6月', valueText: '6.00%' },
      { color: 'peer', label: '同类平均', valueText: '5.00%' },
      { color: 'reference', label: '上证指数', valueText: '7.00%' },
      { color: 'drawdown', label: '最大回撤', valueText: '7.50%' },
    ],
  }
}
