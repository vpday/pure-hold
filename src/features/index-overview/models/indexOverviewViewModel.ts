export type QuoteTrend = 'down' | 'flat' | 'unknown' | 'up'
export type StatusTone = 'error' | 'neutral' | 'warning'

export interface IndexQuoteViewModel {
  readonly changeAmountText: string
  readonly changePercentText: string
  readonly code: string
  readonly id: string
  readonly name: string
  readonly priceText: string
  readonly trend: QuoteTrend
}

export interface IndexQuoteGroupViewModel {
  readonly id: string
  readonly items: readonly IndexQuoteViewModel[]
  readonly name: string
}

export interface IndexOverviewViewModel {
  readonly groups: readonly IndexQuoteGroupViewModel[]
  readonly statusText: string
  readonly statusTone: StatusTone
}
