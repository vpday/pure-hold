import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDrawdownComparisonChartModel } from '../models/fundDrawdownComparisonChart.ts'
import { buildFundDrawdownComparisonChartOption } from './buildFundDrawdownComparisonChartOption.ts'

test('builds a fund area line, benchmark line and zero baseline', () => {
  const option = buildFundDrawdownComparisonChartOption(model([0, -12.3], [0, -8]), {
    theme: { benchmark: 'blue', fund: 'red', zeroLine: 'gray' },
  })
  const [fund, benchmark] = option.series as readonly Record<string, unknown>[]

  assert.equal(fund?.smooth, false)
  assert.equal(fund?.connectNulls, false)
  assert.deepEqual(fund?.areaStyle, { color: 'red', opacity: 0.12 })
  assert.deepEqual(fund?.lineStyle, { color: 'red' })
  assert.deepEqual(benchmark?.lineStyle, { color: 'blue' })
  assert.equal('areaStyle' in benchmark!, false)
  assert.deepEqual(fund?.markLine, {
    data: [{ yAxis: 0 }],
    label: { formatter: '0%', position: 'insideEndTop' },
    lineStyle: { color: 'gray', type: 'dashed' },
    silent: true,
    symbol: 'none',
  })
  assert.deepEqual((option.legend as { data: unknown }).data, ['基金回撤', '沪深300全收益回撤'])
})

test('keeps the y axis non-positive and readable for drawdowns and all-zero paths', () => {
  const drawdown = buildFundDrawdownComparisonChartOption(model([0, -17.32], [0, -8]))
  const yAxis = drawdown.yAxis as {
    axisLabel: { formatter: (value: number) => string }
    interval: number
    max: number
    min: number
  }
  assert.equal(yAxis.max, 0)
  assert.equal(yAxis.min, -20)
  assert.equal(yAxis.interval, 5)
  assert.equal(yAxis.axisLabel.formatter(-5), '-5.00%')
  assert.equal(yAxis.axisLabel.formatter(0), '0.00%')

  const zeroAxis = buildFundDrawdownComparisonChartOption(model([0], [0])).yAxis as {
    max: number
    min: number
  }
  assert.equal(zeroAxis.max, 0)
  assert.equal(zeroAxis.min, -1)
})

test('hides the legend on narrow layouts and formats ordered tooltip rows', () => {
  const option = buildFundDrawdownComparisonChartOption(model([0, -12.345], [0, -6.789]), {
    showLegend: false,
  })
  assert.equal((option.legend as { show: boolean }).show, false)
  assert.equal((option.grid as { top: number }).top, 16)

  const formatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter
  assert.equal(
    formatter([
      {
        axisValue: '2026-08-07',
        marker: 'F',
        seriesName: '基金回撤',
        value: -12.345,
      },
      {
        axisValue: '2026-08-07',
        marker: 'B',
        seriesName: '沪深300全收益回撤',
        value: -6.789,
      },
    ]),
    '2026-08-07<br />F基金回撤：12.35%<br />B沪深300全收益回撤：6.79%',
  )
})

function model(
  fundValues: readonly number[],
  benchmarkValues: readonly number[],
): FundDrawdownComparisonChartModel {
  return {
    actualRangeText: '实际区间 2026-01-01 至 2026-08-07',
    commonCutoffText: '共同截至 2026-08-07',
    dates: fundValues.map((_value, index) => `2026-01-0${index + 1}`),
    emptyText: '',
    rangeLabel: '成立来',
    series: [
      { name: '基金回撤', values: fundValues },
      { name: '沪深300全收益回撤', values: benchmarkValues },
    ],
    summary: [
      { label: '基金最大回撤', valueText: '-12.35%' },
      { label: '沪深300全收益最大回撤', valueText: '-6.79%' },
    ],
  }
}
