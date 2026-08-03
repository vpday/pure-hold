import type { LineSeriesOption } from 'echarts/charts'
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  MarkPointComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundNetValueChartModel } from '../models/fundNetValueChart.ts'

export type FundNetValueChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | MarkPointComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
>

export interface FundNetValueChartTheme {
  readonly decrease?: string
  readonly cumulativeLine?: string
  readonly event?: string
  readonly increase?: string
  readonly text?: string
  readonly unitLine?: string
}

export function buildFundNetValueChartOption(
  model: FundNetValueChartModel,
  theme: FundNetValueChartTheme = {},
): FundNetValueChartOption {
  const colors = [theme.unitLine, theme.cumulativeLine]
  const eventDates = new Set(model.events.map(({ date }) => date))
  const eventMarkPoint: LineSeriesOption['markPoint'] = model.events.length
    ? {
        data: model.events.map((event) => ({
          coord: [event.date, event.unitNetValue],
          itemStyle: theme.event ? { color: theme.event } : undefined,
          label: { color: theme.event, formatter: eventMarkerLabel(event.types), offset: [0, -15] },
          name: eventNames(event.types),
          symbol:
            'path://M8,2a0.75,0.75,0,0,1,0.75,0.75l0,8.6899995803833l3.2200002670288086,-3.219999313354492a0.75,0.75,0,1,1,1.0599994659423828,1.0599994659423828l-4.5,4.5a0.75,0.75,0,0,1,-1.059999942779541,0l-4.499999761581421,-4.5a0.75,0.75,0,0,1,1.0600001811981201,-1.0599994659423828l3.2199997901916504,3.219999313354492L7.25,2.75A0.75,0.75,0,0,1,8,2Z',
          symbolSize: [8, 20],
          symbolRotate: 0,
          symbolOffset: [0, -11],
        })),
      }
    : undefined
  return {
    animationDuration: 250,
    grid: {
      bottom: 0,
      left: 0,
      outerBoundsContain: 'axisLabel',
      outerBoundsMode: 'same',
      right: 10,
      top: 26,
    },
    legend: {
      data: model.series.map(({ name }) => name),
      right: 0,
      top: 0,
      type: 'scroll',
    },
    dataZoom: [
      {
        type: 'inside',
        realtime: true,
      },
    ],
    series: model.series.map(({ name, values }, index) => {
      const showEventSymbols = index === 0 && eventDates.size > 0
      return {
        connectNulls: false,
        data: [...values],
        itemStyle: colors[index] ? { color: colors[index] } : undefined,
        lineStyle: colors[index] ? { color: colors[index] } : undefined,
        markPoint: index === 0 ? eventMarkPoint : undefined,
        name,
        showAllSymbol: showEventSymbols,
        showSymbol: showEventSymbols,
        smooth: false,
        symbol: showEventSymbols ? 'circle' : undefined,
        symbolSize: showEventSymbols
          ? (_value, { dataIndex }) => (eventDates.has(model.dates[dataIndex] ?? '') ? 6 : 0)
          : undefined,
        type: 'line',
      }
    }),
    tooltip: {
      axisPointer: { type: 'line' },
      formatter: (value: unknown) => formatTooltip(value, model, theme),
      trigger: 'axis',
    },
    xAxis: {
      boundaryGap: false,
      data: [...model.dates],
      type: 'category',
    },
    yAxis: {
      axisLabel: {
        formatter: (value: number) => value.toFixed(4),
      },
      scale: true,
      type: 'value',
    },
  }
}

interface TooltipItem {
  readonly axisValue?: unknown
  readonly dataIndex?: unknown
  readonly marker?: unknown
  readonly seriesName?: unknown
  readonly value?: unknown
}

function formatTooltip(
  value: unknown,
  model: FundNetValueChartModel,
  theme: FundNetValueChartTheme,
): string {
  const items = Array.isArray(value) ? (value as TooltipItem[]) : []
  const item = items[0]
  const date = typeof item?.axisValue === 'string' ? item.axisValue : ''
  const index = typeof item?.dataIndex === 'number' ? item.dataIndex : -1
  const seriesNames = new Set(model.series.map(({ name }) => name))
  const valueLines = items.flatMap((seriesItem) => {
    const name = typeof seriesItem.seriesName === 'string' ? seriesItem.seriesName : ''
    if (!seriesNames.has(name)) return []
    const marker = typeof seriesItem.marker === 'string' ? seriesItem.marker : ''
    return [`${marker}${name}：${formatNetValue(toNullableFiniteNumber(seriesItem.value))}`]
  })
  const growth = model.dailyGrowthPercents[index] ?? null
  const growthColor =
    growth === null
      ? undefined
      : growth === 0
        ? theme.text
        : growth > 0
          ? theme.increase
          : theme.decrease
  const growthText = formatGrowth(growth)
  const growthLine = growthColor
    ? `日涨幅：<span style="color:${growthColor}">${growthText}</span>`
    : `日涨幅：${growthText}`
  const events = model.events.find((event) => event.date === date)
  const eventLine = events ? `事件：${eventNames(events.types)}` : undefined
  return [date, ...valueLines, growthLine, eventLine].filter(Boolean).join('<br />')
}

function eventMarkerLabel(types: FundNetValueChartModel['events'][number]['types']): string {
  if (types.length > 1) return String(types.length)
  return types[0] === 'dividend' ? '分红' : '基金经理变更'
}

function eventNames(types: FundNetValueChartModel['events'][number]['types']): string {
  return types.map((type) => (type === 'dividend' ? '分红' : '基金经理变更')).join('、')
}

function formatNetValue(value: number | null): string {
  return value === null ? '--' : value.toFixed(4)
}

function formatGrowth(value: number | null): string {
  if (value === null) return '--'
  const text = `${value.toFixed(2)}%`
  return value > 0 ? `+${text}` : text
}

function toNullableFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}
