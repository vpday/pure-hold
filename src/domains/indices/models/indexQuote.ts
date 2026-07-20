import type { IndexQuoteIssue } from './indexQuoteIssue'

export type IndexQuoteHealth = 'failed' | 'healthy' | 'partial' | 'unknown'

export interface IndexQuoteSnapshot {
  readonly changeAmount: number
  readonly changePercent: number
  readonly indexId: string
  readonly price: number
  readonly quotedAt: number
}

export interface IndexQuoteBatch {
  readonly fetchedAt: number
  readonly issues: readonly IndexQuoteIssue[]
  readonly quotes: readonly IndexQuoteSnapshot[]
}
