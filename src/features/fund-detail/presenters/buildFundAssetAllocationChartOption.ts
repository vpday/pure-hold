import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts'
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundAssetAllocationChartModel } from '../models/fundAssetAllocationChart.ts'

export type FundAssetAllocationChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | DataZoomComponentOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
>

export interface FundAssetAllocationChartTheme {
  readonly bond?: string
  readonly cash?: string
  readonly netAsset?: string
  readonly stock?: string
}

export function buildFundAssetAllocationChartOption(
  model: FundAssetAllocationChartModel,
  theme: FundAssetAllocationChartTheme = {},
): FundAssetAllocationChartOption {
  const colors = [theme.stock, theme.bond, theme.cash, theme.netAsset]
  const lastIndex = Math.max(0, model.dates.length - 1)
  const firstVisibleIndex = Math.max(0, model.dates.length - 6)

  return {
    animationDuration: 250,
    dataZoom: [
      {
        endValue: lastIndex,
        realtime: true,
        startValue: firstVisibleIndex,
        type: 'inside',
      },
    ],
    grid: {
      bottom: 0,
      left: 6,
      right: 8,
      outerBoundsContain: 'axisLabel',
      outerBoundsMode: 'same',
      top: 50,
    },
    legend: {
      data: model.series.map(({ name }) => name),
      right: 0,
      top: 0,
      type: 'scroll',
    },
    series: model.series.map(({ name, values }, index) => {
      const color = colors[index]
      if (index === 3) {
        return {
          connectNulls: false,
          data: [...values],
          itemStyle: color ? { borderColor: color, color } : undefined,
          lineStyle: color ? { color } : undefined,
          name,
          showSymbol: true,
          smooth: true,
          symbol: 'emptyCircle',
          symbolSize: 6,
          type: 'line',
          yAxisIndex: 1,
        } satisfies LineSeriesOption
      }
      return {
        data: [...values],
        itemStyle: color ? { color } : undefined,
        name,
        type: 'bar',
        yAxisIndex: 0,
      } satisfies BarSeriesOption
    }),
    tooltip: {
      axisPointer: { type: 'shadow' },
      formatter: (value: unknown) => formatTooltip(value, model),
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: { formatter: (value: string) => value.slice(2) },
      data: [...model.dates],
      type: 'category',
    },
    yAxis: [
      {
        max: ({ max }: { max: number }) => percentAxisMaximum(max),
        min: 0,
        name: '占净值比(%)',
        type: 'value',
      },
      {
        max: ({ max }: { max: number }) => netAssetAxisMaximum(max),
        min: 0,
        name: '资产规模(亿元)',
        splitLine: { show: false },
        type: 'value',
      },
    ],
  }
}

interface TooltipItem {
  readonly axisValue?: unknown
  readonly dataIndex?: unknown
  readonly marker?: unknown
  readonly seriesName?: unknown
  readonly value?: unknown
}

function formatTooltip(value: unknown, model: FundAssetAllocationChartModel): string {
  const items = Array.isArray(value) ? (value as TooltipItem[]) : []
  const firstItem = items[0]
  const dataIndex = typeof firstItem?.dataIndex === 'number' ? firstItem.dataIndex : -1
  const date =
    model.dates[dataIndex] ?? (typeof firstItem?.axisValue === 'string' ? firstItem.axisValue : '')
  const itemByName = new Map(
    items.flatMap((item) =>
      typeof item.seriesName === 'string' ? [[item.seriesName, item] as const] : [],
    ),
  )
  const lines = model.series.map((series, index) => {
    const item = itemByName.get(series.name)
    const marker = typeof item?.marker === 'string' ? item.marker : ''
    const itemValue = item ? toNullableFiniteNumber(item.value) : (series.values[dataIndex] ?? null)
    const unit = index === 3 ? '亿元' : '%'
    return `${marker}${series.name}：${itemValue === null ? '--' : `${itemValue.toFixed(2)}${unit}`}`
  })
  return [date, ...lines].join('<br />')
}

function percentAxisMaximum(value: number): number {
  return Math.max(100, Math.ceil(Math.max(0, value) / 10) * 10)
}

function netAssetAxisMaximum(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

function toNullableFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}
