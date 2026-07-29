import type { LineSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundPerformanceChartModel } from '../models/fundPerformance'

export type FundPerformanceChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | LegendComponentOption | TooltipComponentOption
>

export function buildFundPerformanceChartOption(
  model: FundPerformanceChartModel,
  colors: readonly (string | undefined)[] = [],
  showLegend = true,
): FundPerformanceChartOption {
  return {
    animationDuration: 250,
    grid: { bottom: 24, containLabel: true, left: 12, right: 16, top: showLegend ? 56 : 16 },
    legend: {
      data: model.series.map(({ name }) => name),
      right: 0,
      show: showLegend,
      top: 0,
      type: 'scroll',
    },
    series: model.series.map(({ name, values }, index) => ({
      connectNulls: false,
      data: [...values],
      emphasis: { focus: 'series' },
      lineStyle: colors[index] ? { color: colors[index] } : undefined,
      name,
      showSymbol: false,
      smooth: false,
      type: 'line',
      universalTransition: true,
    })),
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
      axisLabel: {
        formatter: (value: number) => `${value}%`,
      },
      scale: true,
      type: 'value',
    },
  }
}

interface TooltipItem {
  readonly axisValue?: unknown
  readonly marker?: unknown
  readonly seriesName?: unknown
  readonly value?: unknown
}

function formatTooltip(value: unknown): string {
  const items = Array.isArray(value) ? (value as TooltipItem[]) : []
  const date = typeof items[0]?.axisValue === 'string' ? items[0].axisValue : ''
  const lines = items.flatMap((item) => {
    const number = typeof item.value === 'number' ? item.value : Number(item.value)
    if (!Number.isFinite(number)) return []
    const marker = typeof item.marker === 'string' ? item.marker : ''
    const name = typeof item.seriesName === 'string' ? item.seriesName : ''
    return [`${marker}${name}：${formatSignedPercent(number)}`]
  })
  return [date, ...lines].join('<br />')
}

function formatSignedPercent(value: number): string {
  const text = `${value.toFixed(2)}%`
  return value > 0 ? `+${text}` : text
}
