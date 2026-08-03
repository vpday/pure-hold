import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import type { FundNetValueChartEvent, FundNetValueChartModel } from '../models/fundNetValueChart.ts'

export function toFundNetValueChartModel(history: FundNetValueHistory): FundNetValueChartModel {
  return {
    dailyGrowthPercents: history.points.map(({ dailyGrowthPercent }) => dailyGrowthPercent),
    dates: history.points.map(({ date }) => date),
    events: chartEvents(history),
    series: [
      {
        name: '单位净值',
        values: history.points.map(({ unitNetValue }) => unitNetValue),
      },
      {
        name: '累计净值',
        values: history.points.map(({ cumulativeNetValue }) => cumulativeNetValue),
      },
    ],
  }
}

function chartEvents(history: FundNetValueHistory): readonly FundNetValueChartEvent[] {
  const unitNetValues = new Map(
    history.points.flatMap(({ date, unitNetValue }) =>
      unitNetValue === null ? [] : [[date, unitNetValue] as const],
    ),
  )
  const typesByDate = new Map<string, Set<FundNetValueChartEvent['types'][number]>>()
  for (const event of history.events) {
    if (!unitNetValues.has(event.date)) continue
    const types = typesByDate.get(event.date) ?? new Set()
    types.add(event.type)
    typesByDate.set(event.date, types)
  }
  return [...typesByDate].map(([date, types]) => ({
    date,
    types: [...types],
    unitNetValue: unitNetValues.get(date)!,
  }))
}
