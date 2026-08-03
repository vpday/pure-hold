export interface FundAssetAllocationPoint {
  readonly bondPercent: number | null
  readonly cashPercent: number | null
  readonly date: string
  readonly netAssetValue: number | null
  readonly stockPercent: number | null
}

export interface FundAssetAllocation {
  readonly fundCode: string
  readonly points: readonly FundAssetAllocationPoint[]
}
