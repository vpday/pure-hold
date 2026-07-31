export interface FundDividendDistribution {
  readonly dividendPerTenUnits: number | null
  readonly equityRecordDate: string | null
  readonly exDividendDate: string
  readonly paymentDate: string | null
}

export interface FundShareConversion {
  readonly conversionDate: string
  readonly ratio: number | null
}

export interface FundDistributionHistory {
  readonly conversions: readonly FundShareConversion[]
  readonly dividends: readonly FundDividendDistribution[]
  readonly fundCode: string
}
