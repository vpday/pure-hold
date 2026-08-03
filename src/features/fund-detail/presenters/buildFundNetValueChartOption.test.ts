import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundNetValueChartModel } from '../models/fundNetValueChart.ts'
import { buildFundNetValueChartOption } from './buildFundNetValueChartOption.ts'

const model: FundNetValueChartModel = {
  dailyGrowthPercents: [1.2, -2, 0, null],
  dates: ['2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29'],
  events: [
    { date: '2026-07-28', types: ['dividend'], unitNetValue: 1 },
    { date: '2026-07-29', types: ['manager-change'], unitNetValue: 0.5623 },
  ],
  series: [
    { name: '单位净值', values: [1.2, null, 1, 0.5623] },
    { name: '累计净值', values: [2.2, 2.1, null, 2.5623] },
  ],
}

test('builds two selectable lines and marks events only on the unit net value series', () => {
  const option = buildFundNetValueChartOption(model, {
    cumulativeLine: 'red',
    event: 'orange',
    unitLine: 'blue',
  })
  const series = option.series as readonly {
    readonly connectNulls: boolean
    readonly data: readonly (number | null)[]
    readonly itemStyle: { readonly color: string }
    readonly lineStyle: { readonly color: string }
    readonly markPoint?: unknown
    readonly name: string
    readonly showAllSymbol: boolean
    readonly showSymbol: boolean
    readonly symbol?: string
    readonly symbolSize?: (value: unknown, params: { readonly dataIndex: number }) => number
    readonly type: string
  }[]

  assert.equal(series.length, 2)
  assert.deepEqual(series[0]?.data, [1.2, null, 1, 0.5623])
  assert.equal(series[0]?.connectNulls, false)
  assert.equal(series[0]?.showAllSymbol, true)
  assert.equal(series[0]?.showSymbol, true)
  assert.equal(series[0]?.symbol, 'circle')
  assert.equal(series[0]?.symbolSize?.(1.2, { dataIndex: 0 }), 0)
  assert.equal(series[0]?.symbolSize?.(1, { dataIndex: 2 }), 6)
  assert.equal(series[0]?.symbolSize?.(0.5623, { dataIndex: 3 }), 6)
  assert.equal(series[0]?.type, 'line')
  assert.equal(series[0]?.itemStyle.color, 'blue')
  assert.equal(series[0]?.lineStyle.color, 'blue')
  assert.deepEqual(series[1]?.data, [2.2, 2.1, null, 2.5623])
  assert.equal(series[1]?.itemStyle.color, 'red')
  assert.equal(series[1]?.showSymbol, false)
  assert.equal(series[1]?.symbolSize, undefined)
  assert.notEqual(series[0]?.markPoint, undefined)
  const eventMarkPoints = (
    series[0]?.markPoint as
      | {
          readonly data: readonly {
            readonly coord: readonly [string, number]
            readonly name: string
          }[]
        }
      | undefined
  )?.data
  assert.deepEqual(
    eventMarkPoints?.map(({ coord, name }) => ({ coord, name })),
    [
      { coord: ['2026-07-28', 1], name: '分红' },
      { coord: ['2026-07-29', 0.5623], name: '基金经理变更' },
    ],
  )
  assert.equal(series[1]?.markPoint, undefined)
  assert.deepEqual((option.legend as { data: readonly string[] }).data, ['单位净值', '累计净值'])
  assert.deepEqual(option.grid, {
    bottom: 0,
    left: 0,
    outerBoundsContain: 'axisLabel',
    outerBoundsMode: 'same',
    right: 10,
    top: 26,
  })
})

test('keeps symbols and mark points disabled when there are no events', () => {
  const option = buildFundNetValueChartOption({ ...model, events: [] })
  const series = option.series as readonly {
    readonly markPoint?: unknown
    readonly showAllSymbol: boolean
    readonly showSymbol: boolean
    readonly symbol?: string
    readonly symbolSize?: unknown
  }[]

  assert.equal(series[0]?.showAllSymbol, false)
  assert.equal(series[0]?.showSymbol, false)
  assert.equal(series[0]?.symbol, undefined)
  assert.equal(series[0]?.symbolSize, undefined)
  assert.equal(series[0]?.markPoint, undefined)
  assert.equal(series[1]?.showAllSymbol, false)
  assert.equal(series[1]?.showSymbol, false)
  assert.equal(series[1]?.symbol, undefined)
  assert.equal(series[1]?.symbolSize, undefined)
  assert.equal(series[1]?.markPoint, undefined)
})

test('formats net values and signed growth with semantic colors', () => {
  const option = buildFundNetValueChartOption(model, {
    decrease: 'green',
    increase: 'red',
    text: 'gray',
  })
  const formatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter

  const positive = formatter([tooltipItem(0, '单位净值', 1.2), tooltipItem(0, '累计净值', 2.2)])
  assert.match(positive, /2026-07-26/)
  assert.match(positive, /单位净值：1\.2000/)
  assert.match(positive, /累计净值：2\.2000/)
  assert.match(positive, /color:red[^>]*>\+1\.20%/)

  const negative = formatter([tooltipItem(1, '单位净值', null)])
  assert.match(negative, /单位净值：--/)
  assert.doesNotMatch(negative, /累计净值/)
  assert.match(negative, /color:green[^>]*>-2\.00%/)

  const zero = formatter([tooltipItem(2, '单位净值', 1)])
  assert.match(zero, /1\.0000/)
  assert.match(zero, /color:gray[^>]*>0\.00%/)
  assert.match(zero, /事件：分红/)

  const missing = formatter([tooltipItem(3, '单位净值', 0.5623)])
  assert.match(missing, /0\.5623/)
  assert.match(missing, /日涨幅：--/)
  assert.match(missing, /事件：基金经理变更/)
})

test('formats y-axis values to four decimal places', () => {
  const option = buildFundNetValueChartOption(model)
  const formatter = (option.yAxis as { axisLabel: { formatter: (value: number) => string } })
    .axisLabel.formatter
  assert.equal(formatter(1.2), '1.2000')
})

test('formats conversion events and omits growth when the model does not provide it', () => {
  const reinvestedModel: FundNetValueChartModel = {
    dates: ['2026-07-29'],
    events: [
      {
        date: '2026-07-29',
        types: ['dividend', 'conversion'],
        unitNetValue: 1,
      },
    ],
    series: [
      { name: '单位净值', values: [1] },
      { name: '复权净值', values: [2] },
    ],
  }
  const option = buildFundNetValueChartOption(reinvestedModel)
  const formatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter
  const tooltip = formatter([
    {
      axisValue: '2026-07-29',
      dataIndex: 0,
      marker: '●',
      seriesName: '单位净值',
      value: 1,
    },
    {
      axisValue: '2026-07-29',
      dataIndex: 0,
      marker: '●',
      seriesName: '复权净值',
      value: 2,
    },
  ])
  const markPoint = (option.series as readonly { readonly markPoint?: { data: unknown[] } }[])[0]
    ?.markPoint?.data[0]

  assert.doesNotMatch(tooltip, /日涨幅/)
  assert.match(tooltip, /事件：分红、份额折算/)
  assert.equal((markPoint as { name: string }).name, '分红、份额折算')
})

function tooltipItem(dataIndex: number, seriesName: string, value: number | null): unknown {
  return {
    axisValue: model.dates[dataIndex],
    dataIndex,
    marker: '●',
    seriesName,
    value,
  }
}
