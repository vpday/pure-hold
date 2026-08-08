export type FundRefreshIssueCode =
  | 'business-response-failed'
  | 'cache-fallback'
  | 'malformed-record'
  | 'missing-record'
  | 'persistence-failed'
  | 'request-failed'
  | 'unexpected-record'

export interface FundRefreshIssue {
  readonly code: FundRefreshIssueCode
  readonly fundCode?: string
}
