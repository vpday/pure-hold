export interface FundSearchItem {
  readonly code: string
  readonly name: string
}

export interface FundSearchPage {
  readonly items: readonly FundSearchItem[]
  readonly pageIndex: number
  readonly pageSize: 20
  readonly totalCount: number
}
