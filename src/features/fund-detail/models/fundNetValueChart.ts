import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory'

export type FundNetValueChartEventType = 'conversion' | 'dividend' | 'manager-change'

export interface FundNetValueChartEvent {
  readonly date: string
  readonly types: readonly FundNetValueChartEventType[]
  readonly unitNetValue: number
}

export interface FundNetValueChartSeries {
  readonly name: string
  readonly values: readonly (number | null)[]
}

export interface FundNetValueChartModel {
  readonly dailyGrowthPercents?: readonly (number | null)[]
  readonly dates: readonly string[]
  readonly events: readonly FundNetValueChartEvent[]
  readonly series: readonly [FundNetValueChartSeries, FundNetValueChartSeries]
}

export type LoadFundNetValueHistory = (
  fundCode: string,
  range: FundHistoryRange,
  signal?: AbortSignal,
) => Promise<FundNetValueHistory>
