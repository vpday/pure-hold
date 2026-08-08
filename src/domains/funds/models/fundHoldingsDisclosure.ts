export type FundHoldingMarket = 'hk' | 'sh' | 'sz' | 'us'

export type FundHoldingChangeType = 'decreased' | 'increased' | 'new' | 'unchanged' | 'unknown'

export interface FundStockHoldingDisclosure {
  readonly changePercent: number | null
  readonly changeType: FundHoldingChangeType
  readonly code: string
  readonly heavyQuarterCount: number | null
  readonly industryName: string | null
  readonly market: FundHoldingMarket | null
  readonly name: string
  readonly netAssetPercent: number | null
}

export interface FundBondHoldingDisclosure {
  readonly code: string
  readonly market: FundHoldingMarket | null
  readonly name: string
  readonly netAssetPercent: number | null
}

export interface FundStockHoldingsSource {
  readonly code: string
  readonly name: string | null
}

export interface FundHoldingsDisclosure {
  readonly bonds: readonly FundBondHoldingDisclosure[]
  readonly fundCode: string
  readonly reportDate: string
  readonly stockHoldingsSource?: FundStockHoldingsSource
  readonly stocks: readonly FundStockHoldingDisclosure[]
}
