import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundRollingExcessReturnChartModel } from '../models/fundRollingExcessReturnChart.ts'
import { buildFundRollingExcessReturnChartOption } from './buildFundRollingExcessReturnChartOption.ts'

test('builds three unsmoothed lines and keeps the zero reference on excess only', () => {
  const option = buildFundRollingExcessReturnChartOption(model([0, -2, 5]), {
    theme: { benchmark: 'blue', excess: 'purple', fund: 'red' },
  })
  const series = option.series as readonly Record<string, unknown>[]
  const [fund, benchmark, excess] = series

  assert.equal(series.length, 3)
  assert.deepEqual(fund?.data, [0, -2, 5])
  assert.deepEqual(benchmark?.data, [-0, 2, -5])
  assert.deepEqual(excess?.data, [0, -2, 5])
  assert.equal(fund?.connectNulls, false)
  assert.equal(fund?.showSymbol, false)
  assert.equal(fund?.smooth, false)
  assert.deepEqual(fund?.itemStyle, { color: 'red' })
  assert.deepEqual(fund?.lineStyle, { color: 'red', width: 1.5 })
  assert.deepEqual(benchmark?.lineStyle, { color: 'blue', width: 1.5 })
  assert.deepEqual(excess?.lineStyle, { color: 'purple', width: 2.5 })
  assert.equal('markLine' in fund!, false)
  assert.equal('markLine' in benchmark!, false)
  assert.deepEqual(excess?.markLine, {
    data: [{ label: { formatter: '0%' }, yAxis: 0 }],
    silent: true,
    symbol: 'none',
  })
  assert.deepEqual(option.legend, {
    data: ['基金近12月收益', '沪深300全收益近12月收益', '滚动12个月超额收益'],
    right: 0,
    show: true,
    top: 0,
  })
  assert.deepEqual(option.dataZoom, [{ realtime: true, type: 'inside' }])
  assert.equal((option.yAxis as { min: number }).min, -5)
  assert.equal((option.yAxis as { max: number }).max, 5)
})

test('uses a stable one-percent symmetric range for all-zero values', () => {
  const option = buildFundRollingExcessReturnChartOption(model([0, 0]))
  assert.equal((option.yAxis as { min: number }).min, -1)
  assert.equal((option.yAxis as { max: number }).max, 1)
  assert.equal((option.yAxis as { interval: number }).interval, 0.25)
})

test('uses all three lines for the symmetric axis and formats axis labels', () => {
  const source = model([1])
  const option = buildFundRollingExcessReturnChartOption({
    ...source,
    benchmarkValues: [-8.58],
    fundValues: [17.320744964871125],
  })
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
})

test('hides the legend on narrow layouts and formats ordered tooltip values', () => {
  const option = buildFundRollingExcessReturnChartOption(model([1.234, -2, 0]), {
    showLegend: false,
  })
  assert.equal((option.legend as { show: boolean }).show, false)
  assert.equal((option.grid as { top: number }).top, 16)

  const xAxis = option.xAxis as {
    axisLabel: { formatter: (value: string) => string }
    data: readonly string[]
  }
  assert.deepEqual(xAxis.data, ['2026-01-28', '2026-02-28', '2026-03-28'])
  assert.equal(xAxis.axisLabel.formatter('2026-07-31'), '2026-07')

  const formatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter
  const tooltip = formatter([
    {
      axisValue: '2026-02-28',
      dataIndex: 1,
      marker: '<span>fund-marker</span>',
      seriesName: '基金近12月收益',
    },
    {
      axisValue: '2026-02-28',
      dataIndex: 1,
      marker: '<span>benchmark-marker</span>',
      seriesName: '沪深300全收益近12月收益',
    },
    {
      axisValue: '2026-02-28',
      dataIndex: 1,
      marker: '<span>excess-marker</span>',
      seriesName: '滚动12个月超额收益',
    },
  ])
  assert.match(tooltip, /<span>fund-marker<\/span>基金近12月收益/)
  assert.match(tooltip, /<span>benchmark-marker<\/span>沪深300全收益近12月收益/)
  assert.match(tooltip, /<span>excess-marker<\/span>滚动12个月超额收益/)
  assert.match(tooltip, /基金近12月收益：.*-2\.00%/)
  assert.match(tooltip, /沪深300全收益近12月收益：.*\+2\.00%/)
  assert.match(tooltip, /滚动12个月超额收益：.*-2\.00%/)
  assert.ok(tooltip.indexOf('基金近12月收益') < tooltip.indexOf('沪深300全收益近12月收益'))
  assert.ok(tooltip.indexOf('沪深300全收益近12月收益') < tooltip.indexOf('滚动12个月超额收益'))
})

function model(values: readonly number[]): FundRollingExcessReturnChartModel {
  return {
    actualRangeText: '实际区间 2026-01-31 至 2026-03-31',
    benchmarkValues: values.map((value) => -value),
    commonCutoffText: '共同截至 2026-03-31',
    dates: values.map((_value, index) => `2026-0${index + 1}-28`),
    emptyText: '',
    fundValues: [...values],
    rangeLabel: '近1年',
    series: { name: '滚动12个月超额收益', values },
    summary: [
      { color: 'fund', label: '基金近12月收益', trend: 'up', valueText: '+1.00%' },
      {
        color: 'benchmark',
        label: '沪深300全收益近12月收益',
        trend: 'down',
        valueText: '-1.00%',
      },
      {
        color: 'excess',
        label: '滚动12个月超额收益',
        trend: 'up',
        valueText: '+1.00%',
      },
    ],
  }
}
