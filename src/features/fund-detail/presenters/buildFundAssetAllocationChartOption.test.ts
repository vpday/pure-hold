import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundAssetAllocationChartModel } from '../models/fundAssetAllocationChart.ts'
import { buildFundAssetAllocationChartOption } from './buildFundAssetAllocationChartOption.ts'

const model = chartModel(20)

test('keeps all periods and opens on the latest six', () => {
  const option = buildFundAssetAllocationChartOption(model)
  const xAxis = option.xAxis as { data: readonly string[] }
  const series = option.series as readonly { data: readonly (number | null)[] }[]
  const dataZoom = (option.dataZoom as readonly Record<string, unknown>[])[0]

  assert.equal(xAxis.data.length, 20)
  assert.deepEqual(
    series.map(({ data }) => data.length),
    [20, 20, 20, 20],
  )
  assert.equal(dataZoom?.type, 'inside')
  assert.equal(dataZoom?.realtime, true)
  assert.equal(dataZoom?.startValue, 14)
  assert.equal(dataZoom?.endValue, 19)
  assert.equal(dataZoom?.zoomOnMouseWheel, false)
  assert.equal(dataZoom?.moveOnMouseWheel, false)
  assert.equal(dataZoom?.moveOnMouseMove, true)
})

test('shows every period when there are six or fewer', () => {
  for (const count of [3, 6]) {
    const option = buildFundAssetAllocationChartOption(chartModel(count))
    const dataZoom = (option.dataZoom as readonly Record<string, unknown>[])[0]
    assert.equal(dataZoom?.startValue, 0)
    assert.equal(dataZoom?.endValue, count - 1)
  }
})

test('builds three left-axis bars and one smooth right-axis line', () => {
  const option = buildFundAssetAllocationChartOption(model, {
    bond: 'green',
    cash: 'gray',
    netAsset: 'orange',
    stock: 'blue',
  })
  const series = option.series as readonly {
    readonly itemStyle?: { readonly color: string }
    readonly name: string
    readonly showSymbol?: boolean
    readonly smooth?: boolean
    readonly symbol?: string
    readonly type: string
    readonly yAxisIndex: number
  }[]

  assert.deepEqual(
    series.map(({ name }) => name),
    ['股票占净值比', '债券占净值比', '现金占净值比', '资产净值'],
  )
  assert.deepEqual(
    series.map(({ type }) => type),
    ['bar', 'bar', 'bar', 'line'],
  )
  assert.deepEqual(
    series.map(({ yAxisIndex }) => yAxisIndex),
    [0, 0, 0, 1],
  )
  assert.deepEqual(
    series.map(({ itemStyle }) => itemStyle?.color),
    ['blue', 'green', 'gray', 'orange'],
  )
  assert.equal(series[3]?.smooth, true)
  assert.equal(series[3]?.showSymbol, true)
  assert.equal(series[3]?.symbol, 'emptyCircle')
  assert.deepEqual((option.legend as { data: readonly string[] }).data, [
    '股票占净值比',
    '债券占净值比',
    '现金占净值比',
    '资产净值',
  ])
})

test('formats short axis dates and complete ordered tooltip values', () => {
  const option = buildFundAssetAllocationChartOption({
    dates: ['2026-06-30'],
    series: [
      { name: '股票占净值比', values: [94.62] },
      { name: '债券占净值比', values: [null] },
      { name: '现金占净值比', values: [5.73] },
      { name: '资产净值', values: [402.2078] },
    ],
  })
  const axisFormatter = (option.xAxis as { axisLabel: { formatter: (value: string) => string } })
    .axisLabel.formatter
  const tooltipFormatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter
  const tooltip = tooltipFormatter([
    tooltipItem('资产净值', 402.2078),
    tooltipItem('现金占净值比', 5.73),
    tooltipItem('股票占净值比', 94.62),
  ])

  assert.equal(axisFormatter('2026-06-30'), '26-06-30')
  assert.match(tooltip, /^2026-06-30/)
  assert.match(
    tooltip.replaceAll('●', ''),
    /股票占净值比：94\.62%<br \/>债券占净值比：--<br \/>现金占净值比：5\.73%<br \/>资产净值：402\.21亿元/,
  )
})

test('keeps percentage and net-asset axes readable without clipping', () => {
  const option = buildFundAssetAllocationChartOption(model)
  const legend = option.legend as { left?: number; right?: number }
  const axes = option.yAxis as readonly {
    readonly max: (value: { max: number }) => number
    readonly min: number
    readonly name: string
    readonly splitLine?: { readonly show: boolean }
  }[]

  assert.equal(legend.left, undefined)
  assert.equal(legend.right, 0)
  assert.equal(axes[0]?.name, '占净值比(%)')
  assert.equal(axes[0]?.min, 0)
  assert.equal(axes[0]?.max({ max: 95 }), 100)
  assert.equal(axes[0]?.max({ max: 105.5 }), 110)
  assert.equal(axes[1]?.name, '资产规模(亿元)')
  assert.equal(axes[1]?.min, 0)
  assert.equal(axes[1]?.max({ max: 402.2078 }), 500)
  assert.equal(axes[1]?.splitLine?.show, false)
})

function chartModel(count: number): FundAssetAllocationChartModel {
  const indexes = Array.from({ length: count }, (_, index) => index)
  return {
    dates: indexes.map(
      (index) => `202${Math.floor(index / 4)}-${String((index % 4) * 3 + 3).padStart(2, '0')}-30`,
    ),
    series: [
      { name: '股票占净值比', values: indexes.map((index) => 80 + index) },
      { name: '债券占净值比', values: indexes.map((index) => index) },
      { name: '现金占净值比', values: indexes.map((index) => (index === 0 ? null : index)) },
      { name: '资产净值', values: indexes.map((index) => 300 + index) },
    ],
  }
}

function tooltipItem(seriesName: string, value: number | null): unknown {
  return {
    axisValue: '2026-06-30',
    dataIndex: 0,
    marker: '●',
    seriesName,
    value,
  }
}
