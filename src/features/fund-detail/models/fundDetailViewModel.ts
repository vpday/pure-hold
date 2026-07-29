export type FundDetailTrend = 'down' | 'flat' | 'unknown' | 'up'

export interface FundDetailViewModel {
  readonly code: string
  readonly companyName: string
  readonly dailyChangePercentText: string
  readonly dailyChangeTrend: FundDetailTrend
  readonly establishedDateText: string
  readonly fundType: string
  readonly morningstarRating: number | null
  readonly name: string
  readonly navDateText: string
  readonly navText: string
  readonly netAssetsDateText: string
  readonly netAssetsText: string
  readonly oneYearReturnText: string
  readonly oneYearReturnTrend: FundDetailTrend
  readonly riskText: string
  readonly shanghaiRating: number | null
  readonly trackingErrorText: string
  readonly trackingIndexName: string
}
