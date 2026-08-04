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

export type FundSortField =
  | 'dailyChangePercent'
  | 'estimatedChangePercent'
  | 'estimatedNav'
  | 'nav'
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
  readonly name: string
  readonly navDateText: string
  readonly navText: string
  readonly returns: Readonly<Record<FundReturnField, string>>
  readonly returnsDateText: string
  readonly tags: readonly string[]
  readonly trendByField: Readonly<
    Record<FundReturnField | 'dailyChangePercent' | 'estimatedChangePercent', FundTrend>
  >
}
