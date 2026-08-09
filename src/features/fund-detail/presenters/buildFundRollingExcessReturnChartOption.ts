import type { LineSeriesOption } from 'echarts/charts'
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundRollingExcessReturnChartModel } from '../models/fundRollingExcessReturnChart.ts'

export type FundRollingExcessReturnChartOption = ComposeOption<
  | DataZoomComponentOption
  | GridComponentOption
  | LegendComponentOption
  | LineSeriesOption
  | TooltipComponentOption
>

export interface BuildFundRollingExcessReturnChartOptionOptions {
  readonly showLegend?: boolean
  readonly theme?: {
    readonly benchmark?: string
    readonly excess?: string
    readonly fund?: string
  }
}

export function buildFundRollingExcessReturnChartOption(
  model: FundRollingExcessReturnChartModel,
  options: BuildFundRollingExcessReturnChartOptionOptions = {},
): FundRollingExcessReturnChartOption {
  const { showLegend = true, theme = {} } = options
  const maxAbs = symmetricMaximum([
    ...model.fundValues,
    ...model.benchmarkValues,
    ...model.series.values,
  ])
  const series: LineSeriesOption[] = [
    {
      connectNulls: false,
      data: [...model.fundValues],
      emphasis: { focus: 'series' },
      itemStyle: theme.fund ? { color: theme.fund } : undefined,
      lineStyle: { color: theme.fund, width: 1.5 },
      name: '基金近12月收益',
      showSymbol: false,
      smooth: false,
      type: 'line',
      universalTransition: true,
    },
    {
      connectNulls: false,
      data: [...model.benchmarkValues],
      emphasis: { focus: 'series' },
      itemStyle: theme.benchmark ? { color: theme.benchmark } : undefined,
      lineStyle: { color: theme.benchmark, width: 1.5 },
      name: '沪深300全收益近12月收益',
      showSymbol: false,
      smooth: false,
      type: 'line',
      universalTransition: true,
    },
    {
      connectNulls: false,
      data: [...model.series.values],
      emphasis: { focus: 'series' },
      itemStyle: theme.excess ? { color: theme.excess } : undefined,
      lineStyle: { color: theme.excess, width: 2.5 },
      markLine: {
        data: [{ label: { formatter: '0%' }, yAxis: 0 }],
        silent: true,
        symbol: 'none',
      },
      name: model.series.name,
      showSymbol: false,
      smooth: false,
      type: 'line',
      universalTransition: true,
    },
  ]

  return {
    animationDuration: 250,
    dataZoom: [
      {
        realtime: true,
        type: 'inside',
      },
    ],
    grid: {
      bottom: 0,
      left: 0,
      outerBoundsContain: 'axisLabel',
      outerBoundsMode: 'same',
      right: 10,
      top: showLegend ? 36 : 16,
    },
    legend: {
      data: ['基金近12月收益', '沪深300全收益近12月收益', model.series.name],
      right: 0,
      show: showLegend,
      top: 0,
    },
    series,
    tooltip: {
      axisPointer: { type: 'line' },
      formatter: (value) => formatTooltip(model, value),
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: { formatter: (value: string) => value.slice(0, 7) },
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

function symmetricMaximum(values: readonly number[]): number {
  const maximum = Math.max(1, ...values.filter(Number.isFinite).map((value) => Math.abs(value)))
  const magnitude = 10 ** Math.floor(Math.log10(maximum))
  const normalized = maximum / magnitude
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return factor * magnitude
}

interface TooltipItem {
  readonly axisValue?: unknown
  readonly dataIndex?: unknown
  readonly marker?: unknown
  readonly seriesName?: unknown
}

function formatTooltip(model: FundRollingExcessReturnChartModel, value: unknown): string {
  const items = Array.isArray(value) ? (value as TooltipItem[]) : []
  const item = items.find(({ seriesName }) => seriesName === model.series.name)
  const dataIndex = typeof item?.dataIndex === 'number' ? item.dataIndex : -1
  const date = typeof item?.axisValue === 'string' ? item.axisValue : ''
  if (dataIndex < 0) return date
  const markerBySeries = new Map(
    items.flatMap(({ marker, seriesName }) =>
      typeof seriesName === 'string'
        ? [[seriesName, typeof marker === 'string' ? marker : ''] as const]
        : [],
    ),
  )
  return [
    date,
    tooltipRow(
      markerBySeries.get('基金近12月收益') ?? '',
      '基金近12月收益',
      model.fundValues[dataIndex],
    ),
    tooltipRow(
      markerBySeries.get('沪深300全收益近12月收益') ?? '',
      '沪深300全收益近12月收益',
      model.benchmarkValues[dataIndex],
    ),
    tooltipRow(
      markerBySeries.get('滚动12个月超额收益') ?? '',
      '滚动12个月超额收益',
      model.series.values[dataIndex],
    ),
  ].join('<br />')
}

function tooltipRow(marker: string, label: string, value: number | undefined): string {
  return value === undefined || !Number.isFinite(value)
    ? `${marker}${label}：--`
    : `${marker}${label}：${formatSignedPercent(value)}`
}

function formatSignedPercent(value: number): string {
  const text = `${value.toFixed(2)}%`
  if (value > 0) return `<span style="color:var(--td-error-color)">+${text}</span>`
  if (value < 0) return `<span style="color:var(--td-success-color)">${text}</span>`
  return `+${text}`
}
