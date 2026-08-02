import type { BarSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundMetricsSectionModel } from '../models/fundMetricsSectionModel.ts'

export type FundCalendarReturnsChartOption = ComposeOption<
  BarSeriesOption | GridComponentOption | LegendComponentOption | TooltipComponentOption
>

export function buildFundCalendarReturnsChartOption(
  model: FundMetricsSectionModel,
): FundCalendarReturnsChartOption {
  const years = [
    ...new Set([
      ...model.quarterlyReturns.map((row) => Number(row.key.slice(0, 4))),
      ...model.annualReturns.map((row) => Number(row.key)),
    ]),
  ]
    .filter(Number.isFinite)
    .sort((left, right) => left - right)
  const quarterlyReturns = new Map(model.quarterlyReturns.map((row) => [row.key, row]))
  const annualReturns = new Map(model.annualReturns.map((row) => [Number(row.key), row]))
  const series: BarSeriesOption[] = [1, 2, 3, 4].map((quarter) => ({
    data: years.map((year) => percentValue(quarterlyReturns.get(`${year}-Q${quarter}`)?.fund.text)),
    name: `${quarter}季度涨幅`,
    type: 'bar',
    emphasis: {
      focus: 'series',
    },
  }))
  series.push({
    data: years.map((year) => percentValue(annualReturns.get(year)?.fund.text)),
    name: '年度涨幅',
    type: 'bar',
    emphasis: {
      focus: 'series',
    },
  })

  return {
    animationDuration: 250,
    grid: {
      bottom: 0,
      left: 0,
      outerBoundsContain: 'axisLabel',
      outerBoundsMode: 'same',
      right: 10,
      top: 36,
    },
    legend: {
      data: series.map(({ name }) => String(name ?? '')),
      right: 0,
      top: 0,
      type: 'scroll',
    },
    series,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: formatTooltip,
    },
    xAxis: {
      data: years.map((year) => `${year}年`),
      type: 'category',
    },
    yAxis: {
      axisLabel: { formatter: (value: number) => `${value.toFixed(2)}%` },
      type: 'value',
    },
  }
}

function percentValue(value: string | undefined): number | null {
  if (!value || value === '--') return null
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : null
}

interface TooltipItem {
  readonly axisValue?: unknown
  readonly marker?: unknown
  readonly seriesName?: unknown
  readonly value?: unknown
}

function formatTooltip(value: unknown): string {
  const items = Array.isArray(value) ? (value as TooltipItem[]) : []
  const year = typeof items[0]?.axisValue === 'string' ? items[0].axisValue : ''
  const lines = items.flatMap((item) => {
    const number = toNullableFiniteNumber(item.value)
    if (number === null) return []
    const marker = typeof item.marker === 'string' ? item.marker : ''
    const name = typeof item.seriesName === 'string' ? item.seriesName : ''
    return name ? [`${marker}${name}：${formatPercentValue(number)}`] : []
  })
  return [year, ...lines].filter(Boolean).join('<br />')
}

function formatPercentValue(number: number): string {
  const text = `${number.toFixed(2)}%`
  if (number > 0) return `<span style="color:var(--td-error-color)">+${text}</span>`
  if (number < 0) return `<span style="color:var(--td-success-color)">${text}</span>`
  return text
}

function toNullableFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}
