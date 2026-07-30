import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundNetValueChartModel } from '../models/fundNetValueChart.ts'
import { buildFundNetValueChartOption } from './buildFundNetValueChartOption.ts'

const model: FundNetValueChartModel = {
  dailyGrowthPercents: [1.2, -2, 0, null],
  dates: ['2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29'],
  name: '单位净值',
  values: [1.2, null, 1, 0.5623],
}

test('builds one red line and preserves null gaps', () => {
  const option = buildFundNetValueChartOption(model, { line: 'red' })
  const series = option.series as readonly {
    readonly connectNulls: boolean
    readonly data: readonly (number | null)[]
    readonly itemStyle: { readonly color: string }
    readonly lineStyle: { readonly color: string }
    readonly markPoint?: unknown
    readonly name: string
    readonly showSymbol: boolean
    readonly type: string
  }[]

  assert.equal(series.length, 1)
  assert.deepEqual(series[0]?.data, [1.2, null, 1, 0.5623])
  assert.equal(series[0]?.connectNulls, false)
  assert.equal(series[0]?.showSymbol, false)
  assert.equal(series[0]?.type, 'line')
  assert.equal(series[0]?.itemStyle.color, 'red')
  assert.equal(series[0]?.lineStyle.color, 'red')
  assert.equal(series[0]?.markPoint, undefined)
  assert.equal('legend' in option, false)
})

test('formats net values and signed growth with semantic colors', () => {
  const option = buildFundNetValueChartOption(model, {
    decrease: 'green',
    increase: 'red',
    text: 'gray',
  })
  const formatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter

  const positive = formatter([tooltipItem(0, 1.2)])
  assert.match(positive, /2026-07-26/)
  assert.match(positive, /单位净值：1\.2000/)
  assert.match(positive, /color:red[^>]*>\+1\.20%/)

  const negative = formatter([tooltipItem(1, null)])
  assert.match(negative, /单位净值：--/)
  assert.match(negative, /color:green[^>]*>-2\.00%/)

  const zero = formatter([tooltipItem(2, 1)])
  assert.match(zero, /1\.0000/)
  assert.match(zero, /color:gray[^>]*>0\.00%/)

  const missing = formatter([tooltipItem(3, 0.5623)])
  assert.match(missing, /0\.5623/)
  assert.match(missing, /日涨幅：--/)
})

test('formats y-axis values to four decimal places', () => {
  const option = buildFundNetValueChartOption(model)
  const formatter = (option.yAxis as { axisLabel: { formatter: (value: number) => string } })
    .axisLabel.formatter
  assert.equal(formatter(1.2), '1.2000')
})

function tooltipItem(dataIndex: number, value: number | null): unknown {
  return {
    axisValue: model.dates[dataIndex],
    dataIndex,
    marker: '●',
    seriesName: '单位净值',
    value,
  }
}
