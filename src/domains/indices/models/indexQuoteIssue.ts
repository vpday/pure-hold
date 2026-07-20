export type IndexQuoteIssueCode =
  | 'invalid-change-amount'
  | 'invalid-change-percent'
  | 'invalid-price'
  | 'invalid-quote-time'
  | 'malformed-record'
  | 'market-status-failed'
  | 'missing-response'
  | 'request-failed'
  | 'security-code-mismatch'

export interface IndexQuoteIssue {
  readonly code: IndexQuoteIssueCode
  readonly indexId: string
}
