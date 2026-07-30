import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { FundNetValueChartModel } from '../models/fundNetValueChart.ts'

export type FundNetValueChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption
>

export interface FundNetValueChartTheme {
  readonly decrease?: string
  readonly increase?: string
  readonly line?: string
  readonly text?: string
}

export function buildFundNetValueChartOption(
  model: FundNetValueChartModel,
  theme: FundNetValueChartTheme = {},
): FundNetValueChartOption {
  return {
    animationDuration: 250,
    grid: {
      bottom: 0,
      containLabel: true,
      left: 0,
      right: 10,
      top: 0,
    },
    series: [
      {
        connectNulls: false,
        data: [...model.values],
        itemStyle: theme.line ? { color: theme.line } : undefined,
        lineStyle: theme.line ? { color: theme.line } : undefined,
        name: model.name,
        showSymbol: false,
        smooth: false,
        type: 'line',
      },
    ],
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
  const item = Array.isArray(value) ? (value[0] as TooltipItem | undefined) : undefined
  const date = typeof item?.axisValue === 'string' ? item.axisValue : ''
  const index = typeof item?.dataIndex === 'number' ? item.dataIndex : -1
  const marker = typeof item?.marker === 'string' ? item.marker : ''
  const name =
    typeof item?.seriesName === 'string' && item.seriesName ? item.seriesName : model.name
  const netValue = toNullableFiniteNumber(item?.value)
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
  return [date, `${marker}${name}：${formatNetValue(netValue)}`, growthLine].join('<br />')
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
