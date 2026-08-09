import type { LineSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundDrawdownComparisonChartModel } from '../models/fundDrawdownComparisonChart.ts'

export type FundDrawdownComparisonChartOption = ComposeOption<
  GridComponentOption | LegendComponentOption | LineSeriesOption | TooltipComponentOption
>

export interface BuildFundDrawdownComparisonChartOptionOptions {
  readonly showLegend?: boolean
  readonly theme?: {
    readonly benchmark?: string
    readonly fund?: string
    readonly zeroLine?: string
  }
}

export function buildFundDrawdownComparisonChartOption(
  model: FundDrawdownComparisonChartModel,
  options: BuildFundDrawdownComparisonChartOptionOptions = {},
): FundDrawdownComparisonChartOption {
  const { showLegend = true, theme = {} } = options
  const [fund, benchmark] = model.series
  const minimum = axisMinimum([...fund.values, ...benchmark.values])
  const series: LineSeriesOption[] = [
    {
      areaStyle: { color: theme.fund, opacity: 0.12 },
      connectNulls: false,
      data: [...fund.values],
      emphasis: { focus: 'series' },
      itemStyle: theme.fund ? { color: theme.fund } : undefined,
      lineStyle: theme.fund ? { color: theme.fund } : undefined,
      markLine: {
        data: [{ yAxis: 0 }],
        label: { formatter: '0%', position: 'insideEndTop' },
        lineStyle: { color: theme.zeroLine, type: 'dashed' },
        silent: true,
        symbol: 'none',
      },
      name: fund.name,
      showSymbol: false,
      smooth: false,
      type: 'line',
      universalTransition: true,
    },
    {
      connectNulls: false,
      data: [...benchmark.values],
      emphasis: { focus: 'series' },
      itemStyle: theme.benchmark ? { color: theme.benchmark } : undefined,
      lineStyle: theme.benchmark ? { color: theme.benchmark } : undefined,
      name: benchmark.name,
      showSymbol: false,
      smooth: false,
      type: 'line',
      universalTransition: true,
    },
  ]

  return {
    animationDuration: 250,
    grid: {
      bottom: 0,
      left: 0,
      outerBoundsContain: 'axisLabel',
      outerBoundsMode: 'same',
      right: 10,
      top: showLegend ? 36 : 16,
    },
    legend: {
      data: model.series.map(({ name }) => name),
      right: 0,
      show: showLegend,
      top: 0,
    },
    series,
    tooltip: {
      axisPointer: { type: 'line' },
      formatter: formatTooltip,
      trigger: 'axis',
    },
    xAxis: {
      boundaryGap: false,
      data: [...model.dates],
      type: 'category',
    },
    yAxis: {
      axisLabel: { formatter: formatAxisPercent },
      interval: Math.abs(minimum) / 4,
      max: 0,
      min: minimum,
      type: 'value',
    },
  }
}

function axisMinimum(values: readonly number[]): number {
  const magnitude = Math.max(1, ...values.filter(Number.isFinite).map((value) => Math.abs(value)))
  const unit = 10 ** Math.floor(Math.log10(magnitude))
  const normalized = magnitude / unit
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return -(factor * unit)
}

interface TooltipItem {
  readonly axisValue?: unknown
  readonly marker?: unknown
  readonly seriesName?: unknown
  readonly value?: unknown
}

function formatTooltip(value: unknown): string {
  const items = Array.isArray(value) ? (value as TooltipItem[]) : []
  const date = items.find(({ axisValue }) => typeof axisValue === 'string')?.axisValue ?? ''
  const rows = ['基金回撤', '沪深300全收益回撤'].flatMap((name) => {
    const item = items.find(({ seriesName }) => seriesName === name)
    const number = typeof item?.value === 'number' ? item.value : Number(item?.value)
    if (!Number.isFinite(number)) return []
    const marker = typeof item?.marker === 'string' ? item.marker : ''
    return [`${marker}${name}：${formatDrawdownPercent(number)}`]
  })
  return [date, ...rows].join('<br />')
}

function formatAxisPercent(value: number): string {
  return `${Math.min(value, 0).toFixed(2)}%`
}

function formatDrawdownPercent(value: number): string {
  return `${Math.abs(value).toFixed(2)}%`
}
