import type { FundHistoryRange } from './fundHistoryRange.ts'

export interface FundNetValuePoint {
  readonly cumulativeNetValue: number | null
  readonly dailyGrowthPercent: number | null
  readonly date: string
  readonly unitNetValue: number | null
}

export interface FundNetValueHistory {
  readonly fundCode: string
  readonly points: readonly FundNetValuePoint[]
  readonly range: FundHistoryRange
}
