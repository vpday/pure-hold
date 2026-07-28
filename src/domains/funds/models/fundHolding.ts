export type FundDividendMode = 'cash' | 'reinvest'

export interface FundHolding {
  readonly code: string
  readonly costPrice: number
  readonly dividendMode: FundDividendMode
  readonly purchaseDate: string
  readonly units: number
}
