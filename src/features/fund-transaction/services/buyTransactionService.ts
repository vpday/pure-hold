import type { FundValue } from '@/domains/funds/services/tiantian/lookupExactUnitNav.ts'
import type {
  MoneyFieldValue,
  PortfolioBuyEvent,
  UnitsFieldValue,
} from '@/domains/portfolio/models/index.ts'
import { getShanghaiDate } from '@/domains/portfolio/services/tradingCalendar.ts'
import type { PortfolioCommandResult, PortfolioStore } from '@/domains/portfolio/stores/index.ts'

export type BuyTransactionFailureReason = 'exact-nav-mismatch'

export type BuyTransactionResult =
  | PortfolioCommandResult
  | { readonly ok: false; readonly reason: BuyTransactionFailureReason }

export interface BuyActualFacts {
  readonly confirmedDate?: string
  readonly purchaseFee?: MoneyFieldValue
  readonly units?: UnitsFieldValue
}

export function saveBuyDraft(
  store: Pick<PortfolioStore, 'addEvent'>,
  draft: PortfolioBuyEvent,
): PortfolioCommandResult {
  return store.addEvent(draft)
}

export function updateBuyDraft(
  store: Pick<PortfolioStore, 'updateEvent'>,
  draft: PortfolioBuyEvent,
): PortfolioCommandResult {
  return store.updateEvent(draft)
}

export function completeBuyEventWithActualFacts(
  store: Pick<PortfolioStore, 'updateEvent'>,
  event: PortfolioBuyEvent,
  facts: BuyActualFacts,
  now: string,
): PortfolioCommandResult {
  const nextConfirmedDate = facts.confirmedDate ?? event.confirmedDate
  const nextUnits = facts.units ?? event.units
  return store.updateEvent({
    ...event,
    ...(facts.confirmedDate === undefined ? {} : { confirmedDate: facts.confirmedDate }),
    expectedConfirmationDate:
      nextConfirmedDate === undefined ? event.expectedConfirmationDate : undefined,
    ...(facts.purchaseFee === undefined ? {} : { purchaseFee: facts.purchaseFee }),
    ...(facts.units === undefined ? {} : { units: facts.units }),
    settlementStatus: isSettled(nextConfirmedDate, nextUnits) ? 'settled' : 'pending-settlement',
    updatedAt: now,
  })
}

export function completeBuyEventWithExactNav(
  store: Pick<PortfolioStore, 'updateEvent'>,
  event: PortfolioBuyEvent,
  value: FundValue,
  now: string,
): BuyTransactionResult {
  if (
    value.date !== event.navDate ||
    !isHistoricalDate(value.date) ||
    !Number.isFinite(value.unitNav) ||
    value.unitNav <= 0
  ) {
    return { ok: false, reason: 'exact-nav-mismatch' }
  }

  return store.updateEvent({
    ...event,
    settlementStatus: isSettled(event.confirmedDate, event.units)
      ? 'settled'
      : 'pending-settlement',
    unitNav: { confidence: 'actual', source: value.source, value: value.unitNav },
    updatedAt: now,
  })
}

function isSettled(confirmedDate: string | undefined, units: UnitsFieldValue): boolean {
  return confirmedDate !== undefined && units.value !== null && units.confidence === 'actual'
}

function isHistoricalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value < getShanghaiDate()
  )
}
