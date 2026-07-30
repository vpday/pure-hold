import type { FundHistoryRange } from './fundHistoryRange.ts'

export interface FundCumulativeReturnPoint {
  readonly date: string
  readonly fundYieldPercent: number | null
  readonly referenceIndexYieldPercent: number | null
  readonly fundTypeYieldPercent: number | null
}

export interface FundCumulativeReturns {
  readonly fundCode: string
  readonly maximumDrawdownPercent: number | null
  readonly referenceIndexCode: string
  readonly range: FundHistoryRange
  readonly points: readonly FundCumulativeReturnPoint[]
}
