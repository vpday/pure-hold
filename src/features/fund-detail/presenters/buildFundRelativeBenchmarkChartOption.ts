import type { LineSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundRelativeBenchmarkChartModel } from '../models/fundRelativeBenchmarkChart.ts'

export type FundRelativeBenchmarkChartOption = ComposeOption<
  GridComponentOption | LegendComponentOption | LineSeriesOption | TooltipComponentOption
>

export interface BuildFundRelativeBenchmarkChartOptionOptions {
  readonly showLegend?: boolean
  readonly theme?: {
    readonly line?: string
  }
}

export function buildFundRelativeBenchmarkChartOption(
  model: FundRelativeBenchmarkChartModel,
  options: BuildFundRelativeBenchmarkChartOptionOptions = {},
): FundRelativeBenchmarkChartOption {
  const { showLegend = true, theme = {} } = options
  const maxAbs = symmetricMaximum(model.series.values)
  const series: LineSeriesOption = {
    connectNulls: false,
    data: [...model.series.values],
    emphasis: { focus: 'series' },
    itemStyle: theme.line ? { color: theme.line } : undefined,
    lineStyle: theme.line ? { color: theme.line } : undefined,
    name: model.series.name,
    showSymbol: false,
    smooth: false,
    type: 'line',
    universalTransition: true,
  }

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
      data: [model.series.name],
      right: 0,
      show: showLegend,
      top: 0,
    },
    series: [series],
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
      axisLabel: { formatter: (value: number) => `${value.toFixed(2)}%` },
      interval: maxAbs / 4,
      max: maxAbs,
      min: -maxAbs,
      type: 'value',
    },
  }
}

function symmetricMaximum(values: readonly (number | null)[]): number {
  const finiteValues = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  )
  const maximum = Math.max(1, ...finiteValues.map((value) => Math.abs(value)))
  const magnitude = 10 ** Math.floor(Math.log10(maximum))
  const normalized = maximum / magnitude
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return factor * magnitude
}

interface TooltipItem {
  readonly axisValue?: unknown
  readonly marker?: unknown
  readonly seriesName?: unknown
  readonly value?: unknown
}

function formatTooltip(value: unknown): string {
  const items = Array.isArray(value) ? (value as TooltipItem[]) : []
  const item = items.find(({ seriesName }) => seriesName === '累计超额收益')
  const date = typeof item?.axisValue === 'string' ? item.axisValue : ''
  const number = typeof item?.value === 'number' ? item.value : Number(item?.value)
  if (!Number.isFinite(number)) return date
  const marker = typeof item?.marker === 'string' ? item.marker : ''
  return `${date}<br />${marker}累计超额收益：${formatSignedPercent(number)}`
}

function formatSignedPercent(value: number): string {
  const text = `${value.toFixed(2)}%`
  if (value > 0) return `<span style="color:var(--td-error-color)">+${text}</span>`
  if (value < 0) return `<span style="color:var(--td-success-color)">${text}</span>`
  return `+${text}`
}
