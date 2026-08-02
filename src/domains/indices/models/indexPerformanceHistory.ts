export const csi300TotalReturnIndexCode = 'H00300'
export const csi300TotalReturnIndexName = '沪深300全收益指数'
export const csi300TotalReturnStartDate = '20041231'

export type IndexPerformanceHistoryIssueCode =
  | 'duplicate-date'
  | 'malformed-record'
  | 'missing-start-date'

export interface IndexPerformanceHistoryIssue {
  readonly code: IndexPerformanceHistoryIssueCode
  readonly count: number
}

export interface IndexPerformancePoint {
  readonly date: string
  readonly value: number
}

export interface IndexPerformanceHistory {
  readonly endDate: string
  readonly indexCode: typeof csi300TotalReturnIndexCode
  readonly indexName: typeof csi300TotalReturnIndexName
  readonly issues: readonly IndexPerformanceHistoryIssue[]
  readonly points: readonly IndexPerformancePoint[]
  readonly startDate: typeof csi300TotalReturnStartDate
}
