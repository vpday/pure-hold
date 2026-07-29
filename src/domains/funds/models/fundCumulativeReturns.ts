export const fundPerformanceRanges = ['y', '3y', '6y', 'n', '3n', '5n', 'jn', 'ln'] as const

export type FundPerformanceRange = (typeof fundPerformanceRanges)[number]

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
  readonly range: FundPerformanceRange
  readonly points: readonly FundCumulativeReturnPoint[]
}
