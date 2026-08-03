import type { FundHistoryRange } from './fundHistoryRange.ts'

export type FundNetValueEventType = 'dividend' | 'manager-change'

export interface FundNetValueEvent {
  readonly date: string
  readonly type: FundNetValueEventType
}

export interface FundNetValuePoint {
  readonly cumulativeNetValue: number | null
  readonly dailyGrowthPercent: number | null
  readonly date: string
  readonly unitNetValue: number | null
}

export interface FundNetValueHistory {
  readonly events: readonly FundNetValueEvent[]
  readonly fundCode: string
  readonly points: readonly FundNetValuePoint[]
  readonly range: FundHistoryRange
}
