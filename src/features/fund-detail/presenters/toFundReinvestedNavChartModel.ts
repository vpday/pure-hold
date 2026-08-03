import type {
  FundReinvestedNavAppliedEvent,
  FundReinvestedNavPoint,
} from '@/domains/funds/models/fundReinvestedNav.ts'
import type { FundNetValueChartEvent, FundNetValueChartModel } from '../models/fundNetValueChart.ts'

interface FundReinvestedNavChartSource {
  readonly appliedEvents: readonly FundReinvestedNavAppliedEvent[]
  readonly points: readonly FundReinvestedNavPoint[]
}

export function toFundReinvestedNavChartModel(
  source: FundReinvestedNavChartSource,
): FundNetValueChartModel {
  return {
    dates: source.points.map(({ date }) => date),
    events: chartEvents(source),
    series: [
      { name: '单位净值', values: source.points.map(({ unitNetValue }) => unitNetValue) },
      {
        name: '复权净值',
        values: source.points.map(({ reinvestedNetValue }) => reinvestedNetValue),
      },
    ],
  }
}

function chartEvents(source: FundReinvestedNavChartSource): readonly FundNetValueChartEvent[] {
  const unitNetValues = new Map(source.points.map(({ date, unitNetValue }) => [date, unitNetValue]))
  const typesByDate = new Map<string, Set<FundNetValueChartEvent['types'][number]>>()
  for (const event of source.appliedEvents) {
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
