import type { LineSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  MarkPointComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundPerformanceChartModel } from '../models/fundPerformance'

export type FundPerformanceChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | MarkPointComponentOption
  | TooltipComponentOption
>

export interface FundPerformanceChartTheme {
  readonly annotation?: string
  readonly drawdownLine?: string
  readonly fundLine?: string
  readonly peerLine?: string
  readonly referenceLine?: string
}

export interface BuildFundPerformanceChartOptionOptions {
  readonly showLegend?: boolean
  readonly theme?: FundPerformanceChartTheme
}

export function buildFundPerformanceChartOption(
  model: FundPerformanceChartModel,
  options: BuildFundPerformanceChartOptionOptions = {},
): FundPerformanceChartOption {
  const { showLegend = true, theme = {} } = options
  const colors = [theme.fundLine, theme.referenceLine, theme.peerLine]
  const drawdownOverlay = buildFundDrawdownOverlay(model, theme.drawdownLine)
  const fundMarkPoint: LineSeriesOption['markPoint'] = {
    data: [
      { type: 'max', name: 'Max' },
      { type: 'min', name: 'Min' },
    ],
    symbol:
      'path://M8,2a0.75,0.75,0,0,1,0.75,0.75l0,8.6899995803833l3.2200002670288086,-3.219999313354492a0.75,0.75,0,1,1,1.0599994659423828,1.0599994659423828l-4.5,4.5a0.75,0.75,0,0,1,-1.059999942779541,0l-4.499999761581421,-4.5a0.75,0.75,0,0,1,1.0600001811981201,-1.0599994659423828l3.2199997901916504,3.219999313354492L7.25,2.75A0.75,0.75,0,0,1,8,2Z',
    symbolSize: [8, 20],
    symbolRotate: 0,
    symbolOffset: [0, -11],
    itemStyle: theme.annotation ? { color: theme.annotation } : undefined,
    label: {
      color: theme.annotation,
      formatter: '{c}%',
      offset: [0, -15],
    },
  }
  const businessSeries: LineSeriesOption[] = model.series.map(({ name, values }, index) => ({
    connectNulls: false,
    data: [...values],
    emphasis: index === 0 && drawdownOverlay ? { disabled: true } : { focus: 'series' },
    itemStyle: colors[index] ? { color: colors[index] } : undefined,
    lineStyle: colors[index] ? { color: colors[index] } : undefined,
    markPoint: index === 0 ? fundMarkPoint : undefined,
    name,
    showSymbol: false,
    smooth: false,
    type: 'line',
    universalTransition: true,
  }))

  return {
    animationDuration: 250,
    grid: {
      bottom: 20,
      containLabel: true,
      left: 0,
      right: 0,
      top: showLegend ? 36 : 16,
    },
    legend: {
      data: model.series.map(({ name }) => name),
      right: 0,
      show: showLegend,
      top: 0,
      type: 'scroll',
    },
    series: drawdownOverlay ? [...businessSeries, drawdownOverlay] : businessSeries,
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

function buildFundDrawdownOverlay(
  model: FundPerformanceChartModel,
  color?: string,
): LineSeriesOption | undefined {
  const drawdown = model.drawdown
  if (!drawdown) return undefined
  const fundValues = model.series[0].values
  return {
    areaStyle: {
      color,
      opacity: 0.15,
    },
    connectNulls: false,
    data: fundValues.map((value, index) =>
      index >= drawdown.peakIndex && index <= drawdown.troughIndex ? value : null,
    ),
    emphasis: { disabled: true },
    lineStyle: {
      color,
      width: 2,
    },
    name: '',
    showSymbol: false,
    silent: true,
    smooth: false,
    tooltip: { show: false },
    type: 'line',
    z: 3,
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
    if (!name) return []
    return [`${marker}${name}：${formatSignedPercent(number)}`]
  })
  return [date, ...lines].join('<br />')
}

function formatSignedPercent(value: number): string {
  const text = `${value.toFixed(2)}%`
  return value > 0 ? `+${text}` : text
}
