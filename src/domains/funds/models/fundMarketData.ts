export interface FundReturns {
  readonly oneWeek: number | null
  readonly oneMonth: number | null
  readonly threeMonths: number | null
  readonly sixMonths: number | null
  readonly yearToDate: number | null
  readonly oneYear: number | null
  readonly twoYears: number | null
  readonly threeYears: number | null
  readonly fiveYears: number | null
  readonly sinceInception: number | null
}

export interface FundMarketData {
  readonly code: string
  readonly name: string
  readonly tags: readonly string[]
  readonly estimatedNav: number | null
  readonly estimatedChangePercent: number | null
  readonly estimatedAt: string | null
  readonly nav: number | null
  readonly navDate: string | null
  readonly dailyChangePercent: number | null
  readonly returns: FundReturns
  readonly returnsDate: string | null
  readonly fetchedAt: number | null
}
