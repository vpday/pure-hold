export type FundDetailTrend = 'down' | 'flat' | 'unknown' | 'up'
export type FundTradingStatusTone = 'error' | 'neutral' | 'success' | 'warning'

export interface FundTradingRulesViewModel {
  readonly custodyFeeText: string
  readonly dailyPurchaseLimitText: string
  readonly managementFeeText: string
  readonly minimumPurchaseAmountText: string
  readonly purchaseConfirmationText: string
  readonly purchaseDiscountText: string | null
  readonly purchaseFeeText: string
  readonly purchaseStatusText: string
  readonly purchaseStatusTone: FundTradingStatusTone
  readonly redemptionConfirmationText: string
  readonly redemptionFundsArrivalText: string
  readonly redemptionStatusText: string
  readonly redemptionStatusTone: FundTradingStatusTone
  readonly salesServiceFeeText: string
  readonly standardPurchaseFeeText: string | null
}

export interface FundDetailIncomeViewModel {
  readonly amountText: string
  readonly percentText: string
  readonly trend: FundDetailTrend
}

export interface FundDetailHoldingViewModel {
  readonly estimatedIncome: FundDetailIncomeViewModel
  readonly holdingAmountText: string
  readonly holdingDaysText: string
  readonly holdingIncome: FundDetailIncomeViewModel
  readonly todayIncome: FundDetailIncomeViewModel
  readonly yesterdayIncome: FundDetailIncomeViewModel
}

export interface FundDetailViewModel {
  readonly code: string
  readonly companyName: string
  readonly dailyChangePercentText: string
  readonly dailyChangeTrend: FundDetailTrend
  readonly establishedDateText: string
  readonly estimatedAtTimeText: string
  readonly estimatedNavText: string
  readonly fundType: string
  readonly holding: FundDetailHoldingViewModel | null
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
  readonly tradingRules: FundTradingRulesViewModel | null
}
