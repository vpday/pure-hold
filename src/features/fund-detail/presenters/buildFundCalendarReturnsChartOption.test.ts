import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  FundMetricComparisonRowModel,
  FundMetricsSectionModel,
} from '../models/fundMetricsSectionModel.ts'
import { buildFundCalendarReturnsChartOption } from './buildFundCalendarReturnsChartOption.ts'

test('builds five calendar return bars in ascending year order', () => {
  const option = buildFundCalendarReturnsChartOption({
    alerts: [],
    annualized: [],
    annualReturns: [row('2025', '+3.00%')],
    cutoffText: '',
    periods: [],
    quarterlyReturns: [row('2026-Q2', '+1.00%'), row('2026-Q1', '-2.00%'), row('2025-Q4', '--')],
  })
  const xAxis = option.xAxis as { readonly data: readonly string[] }
  const series = option.series as readonly {
    readonly data: readonly (number | null)[]
    readonly name: string
    readonly type: string
  }[]

  assert.deepEqual(xAxis.data, ['2025年', '2026年'])
  assert.deepEqual(
    series.map(({ name }) => name),
    ['1季度涨幅', '2季度涨幅', '3季度涨幅', '4季度涨幅', '年度涨幅'],
  )
  assert.deepEqual(series[0]?.data, [null, -2])
  assert.deepEqual(series[1]?.data, [null, 1])
  assert.deepEqual(series[3]?.data, [null, null])
  assert.deepEqual(series[4]?.data, [3, null])
  assert.ok(series.every(({ type }) => type === 'bar'))
  assert.deepEqual(option.legend, {
    data: ['1季度涨幅', '2季度涨幅', '3季度涨幅', '4季度涨幅', '年度涨幅'],
    right: 0,
    top: 0,
    type: 'scroll',
  })
})

test('formats axes and tooltip values as signed percentages', () => {
  const option = buildFundCalendarReturnsChartOption(emptyModel())
  const tooltipFormatter = (option.tooltip as { formatter: (value: unknown) => string }).formatter
  const yAxisFormatter = (option.yAxis as { axisLabel: { formatter: (value: number) => string } })
    .axisLabel.formatter

  assert.equal(
    tooltipFormatter([
      { axisValue: '2026年', marker: '●', seriesName: '1季度涨幅', value: 1.2 },
      { axisValue: '2026年', marker: '●', seriesName: '2季度涨幅', value: -2 },
      { axisValue: '2026年', marker: '●', seriesName: '3季度涨幅', value: 0 },
      { axisValue: '2026年', marker: '●', seriesName: '4季度涨幅', value: null },
    ]),
    [
      '2026年',
      '●1季度涨幅：<span style="color:var(--td-error-color)">+1.20%</span>',
      '●2季度涨幅：<span style="color:var(--td-success-color)">-2.00%</span>',
      '●3季度涨幅：0.00%',
    ].join('<br />'),
  )
  assert.equal(yAxisFormatter(12.345), '12.35%')
})

function row(key: string, fundText: string): FundMetricComparisonRowModel {
  return {
    benchmark: { text: '--', trend: 'unknown' },
    excess: { text: '--', trend: 'unknown' },
    fund: { text: fundText, trend: 'unknown' },
    key,
    label: key,
  }
}

function emptyModel(): FundMetricsSectionModel {
  return {
    alerts: [],
    annualized: [],
    annualReturns: [],
    cutoffText: '',
    periods: [],
    quarterlyReturns: [],
  }
}
