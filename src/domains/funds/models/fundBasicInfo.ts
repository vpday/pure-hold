export interface FundBasicInfo {
  readonly code: string
  readonly companyName: string | null
  readonly custodyFeePercent: number | null
  readonly dailyPurchaseLimitYuan: number | null
  readonly establishedDate: string | null
  readonly fundType: string | null
  readonly managementFeePercent: number | null
  readonly minimumPurchaseAmountYuan: number | null
  readonly morningstarRating: number | null
  readonly netAssetsYuan: number | null
  readonly netAssetsDate: string | null
  readonly purchaseConfirmationDays: number | null
  readonly purchaseFeePercent: number | null
  readonly purchaseStatus: string | null
  readonly redemptionConfirmationDays: number | null
  readonly redemptionFundsArrivalDays: number | null
  readonly redemptionStatus: string | null
  readonly riskLevel: number | null
  readonly salesServiceFeePercent: number | null
  readonly shanghaiRating: number | null
  readonly standardPurchaseFeePercent: number | null
  readonly trackingError: number | null
  readonly trackingIndexCode: string | null
  readonly trackingIndexName: string | null
}
