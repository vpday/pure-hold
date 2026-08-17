import type { FundValue } from '@/domains/funds/services/tiantian/lookupExactUnitNav.ts'
import type { PortfolioBuyEvent } from '@/domains/portfolio/models/index.ts'
import type { PortfolioCommandResult, PortfolioStore } from '@/domains/portfolio/stores/index.ts'

export type BuyTransactionFailureReason = 'exact-nav-mismatch'

export type BuyTransactionResult =
  | PortfolioCommandResult
  | { readonly ok: false; readonly reason: BuyTransactionFailureReason }

export function saveBuyDraft(
  store: Pick<PortfolioStore, 'addEvent'>,
  draft: PortfolioBuyEvent,
): PortfolioCommandResult {
  return store.addEvent(draft)
}

export function completeBuyEventWithExactNav(
  store: Pick<PortfolioStore, 'updateEvent'>,
  event: PortfolioBuyEvent,
  value: FundValue,
  now: string,
): BuyTransactionResult {
  if (value.date !== event.confirmedDate || !Number.isFinite(value.unitNav) || value.unitNav <= 0) {
    return { ok: false, reason: 'exact-nav-mismatch' }
  }

  const canSettle = event.units.value !== null || event.purchaseFeeRate.value !== null
  return store.updateEvent({
    ...event,
    settlementStatus: canSettle ? 'settled' : 'pending-settlement',
    unitNav: { confidence: 'actual', source: value.source, value: value.unitNav },
    updatedAt: now,
  })
}
