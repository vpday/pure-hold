export type FundTrend = 'down' | 'flat' | 'unknown' | 'up'

export type FundReturnField =
  | 'fiveYears'
  | 'oneMonth'
  | 'oneWeek'
  | 'oneYear'
  | 'sinceInception'
  | 'sixMonths'
  | 'threeMonths'
  | 'threeYears'
  | 'twoYears'
  | 'yearToDate'

export type FundHoldingSortField =
  | 'estimatedIncomePercent'
  | 'holdingAmount'
  | 'holdingDays'
  | 'holdingIncomePercent'
  | 'todayIncomePercent'
  | 'yesterdayIncomePercent'

export type FundSortField =
  | 'dailyChangePercent'
  | 'estimatedChangePercent'
  | 'estimatedNav'
  | 'nav'
  | FundHoldingSortField
  | FundReturnField

export interface FundSort {
  readonly descending: boolean
  readonly sortBy: FundSortField
}

export interface FundRowViewModel {
  readonly code: string
  readonly dailyChangePercentText: string
  readonly estimatedAtText: string
  readonly estimatedChangePercentText: string
  readonly estimatedNavText: string
  readonly holding?: FundHoldingViewModel
  readonly name: string
  readonly navDateText: string
  readonly navText: string
  readonly returns: Readonly<Record<FundReturnField, string>>
  readonly returnsDateText: string
  readonly sortValues: Readonly<Record<FundSortField, number | null>>
  readonly tags: readonly string[]
  readonly trendByField: Readonly<
    Record<FundReturnField | 'dailyChangePercent' | 'estimatedChangePercent', FundTrend>
  >
}

export interface FundIncomeViewModel {
  readonly amountText: string
  readonly percentText: string
  readonly trend: FundTrend
}

export interface FundCurrentIncomeViewModel extends FundIncomeViewModel {
  readonly label: '今日收益' | '估算收益'
  readonly source: 'actual' | 'estimated' | 'none'
}

export interface FundHoldingViewModel {
  readonly confirmedNavDateText: string
  readonly currentIncome: FundCurrentIncomeViewModel
  readonly estimatedIncome: FundIncomeViewModel
  readonly holdingAmountText: string
  readonly holdingDaysText: string
  readonly holdingIncome: FundIncomeViewModel
  readonly sortValues: Readonly<Record<FundHoldingSortField, number | null>>
  readonly todayIncome: FundIncomeViewModel
  readonly yesterdayIncome: FundIncomeViewModel
  readonly yesterdayIncomeDateText: string
}
