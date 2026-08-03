import type { FundHoldingMarket } from './fundHoldingsDisclosure.ts'

export interface FundHoldingQuoteRequest {
  readonly code: string
  readonly market: FundHoldingMarket
}

export interface FundHoldingQuote {
  readonly code: string
  readonly dailyChangePercent: number | null
  readonly latestPrice: number | null
  readonly market: FundHoldingMarket
}
