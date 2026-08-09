import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundCumulativeExcessReturnChartModel } from '../models/fundCumulativeExcessReturnChart.ts'
import { buildFundCumulativeExcessReturnChartOption } from './buildFundCumulativeExcessReturnChartOption.ts'

test('builds one unsmoothed line without a zero reference and with a symmetric axis', () => {
  const option = buildFundCumulativeExcessReturnChartOption(model([0, -2, 5]), {
    theme: { line: 'blue' },
  })
  const series = (option.series as readonly Record<string, unknown>[])[0]!

  assert.equal((option.series as readonly unknown[]).length, 1)
  assert.deepEqual(series.data, [0, -2, 5])
  assert.equal(series.connectNulls, false)
  assert.equal(series.showSymbol, false)
  assert.equal(series.smooth, false)
  assert.deepEqual(series.itemStyle, { color: 'blue' })
  assert.deepEqual(series.lineStyle, { color: 'blue' })
  assert.equal('markLine' in series, false)
  assert.deepEqual(option.legend, {
    data: ['累计超额收益'],
    right: 0,
    show: true,
    top: 0,
  })
  assert.equal((option.yAxis as { min: number }).min, -5)
  assert.equal((option.yAxis as { max: number }).max, 5)
  assert.equal((option.yAxis as { interval: number }).interval, 1.25)
})

test('uses a stable one-percent symmetric range for an all-zero series', () => {
  const option = buildFundCumulativeExcessReturnChartOption(model([0, 0]))
  assert.equal((option.yAxis as { min: number }).min, -1)
  assert.equal((option.yAxis as { max: number }).max, 1)
  assert.equal((option.yAxis as { interval: number }).interval, 0.25)
})

test('rounds extrema to an even grid and formats axis labels with two decimals', () => {
  const option = buildFundCumulativeExcessReturnChartOption(model([-17.320744964871125, 8.58]))
  const yAxis = option.yAxis as {
    axisLabel: { formatter: (value: number) => string }
    interval: number
    max: number
    min: number
  }

  assert.equal(yAxis.min, -20)
  assert.equal(yAxis.max, 20)
  assert.equal(yAxis.interval, 5)
  assert.equal(yAxis.axisLabel.formatter(17.320744964871125), '17.32%')
  assert.equal(yAxis.axisLabel.formatter(-5), '-5.00%')
})

test('hides the legend on narrow layouts and formats signed tooltips', () => {
  const option = buildFundCumulativeExcessReturnChartOption(model([1.234, -2, 0]), {
    showLegend: false,
  })
  assert.equal((option.legend as { show: boolean }).show, false)
  assert.equal((option.grid as { top: number }).top, 16)

  const formatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter
  assert.match(
    formatter([
      {
        axisValue: '2026-08-07',
        marker: '●',
        seriesName: '累计超额收益',
        value: 1.234,
      },
    ]),
    /2026-08-07<br \/>●累计超额收益：.*\+1\.23%/,
  )
})

function model(values: readonly (number | null)[]): FundCumulativeExcessReturnChartModel {
  return {
    actualRangeText: '实际区间 2026-01-01 至 2026-08-07',
    commonCutoffText: '共同截至 2026-08-07',
    dates: values.map((_value, index) => `2026-01-0${index + 1}`),
    emptyText: '',
    rangeLabel: '近6月',
    series: { name: '累计超额收益', values },
    summary: [
      { color: 'fund', label: '基金累计收益', trend: 'neutral', valueText: '+1.00%' },
      {
        color: 'benchmark',
        label: '沪深300全收益',
        trend: 'neutral',
        valueText: '+2.00%',
      },
      {
        color: 'excess',
        label: '累计超额收益',
        trend: 'down',
        valueText: '-1.00%',
      },
    ],
  }
}
