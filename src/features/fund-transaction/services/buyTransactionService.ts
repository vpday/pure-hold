import type { FundValue } from '@/domains/funds/services/tiantian/lookupExactUnitNav.ts'
import type {
  CommitEventInput,
  PortfolioCoordinationResult,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import type {
  MoneyFieldValue,
  PortfolioBuyEvent,
  UnitsFieldValue,
} from '@/domains/portfolio/models/index.ts'
import { getShanghaiDate } from '@/domains/portfolio/services/tradingCalendar.ts'

export type BuyTransactionFailureReason = 'exact-nav-mismatch'

export type BuyTransactionResult =
  | PortfolioCoordinationResult
  | { readonly ok: false; readonly reason: BuyTransactionFailureReason }

export interface BuyActualFacts {
  readonly confirmedDate?: string
  readonly purchaseFee?: MoneyFieldValue
  readonly units?: UnitsFieldValue
}

export function saveBuyDraft(
  coordinator: Pick<PortfolioCoordinator, 'commitEvent'>,
  draft: PortfolioBuyEvent,
  options?: Omit<CommitEventInput, 'event'>,
): PortfolioCoordinationResult {
  return coordinator.commitEvent({ ...options, event: draft })
}

export function updateBuyDraft(
  coordinator: Pick<PortfolioCoordinator, 'commitEvent'>,
  draft: PortfolioBuyEvent,
  options?: Omit<CommitEventInput, 'event'>,
): PortfolioCoordinationResult {
  return coordinator.commitEvent({ ...options, event: draft })
}

export function completeBuyEventWithActualFacts(
  coordinator: Pick<PortfolioCoordinator, 'commitEvent'>,
  event: PortfolioBuyEvent,
  facts: BuyActualFacts,
  now: string,
  options?: Omit<CommitEventInput, 'event'>,
): PortfolioCoordinationResult {
  const nextConfirmedDate = facts.confirmedDate ?? event.confirmedDate
  const nextUnits = facts.units ?? event.units
  return coordinator.commitEvent({
    ...options,
    event: {
      ...event,
      ...(facts.confirmedDate === undefined ? {} : { confirmedDate: facts.confirmedDate }),
      expectedConfirmationDate:
        nextConfirmedDate === undefined ? event.expectedConfirmationDate : undefined,
      ...(facts.purchaseFee === undefined ? {} : { purchaseFee: facts.purchaseFee }),
      ...(facts.units === undefined ? {} : { units: facts.units }),
      settlementStatus: isSettled(nextConfirmedDate, nextUnits) ? 'settled' : 'pending-settlement',
      updatedAt: now,
    },
  })
}

export function completeBuyEventWithExactNav(
  coordinator: Pick<PortfolioCoordinator, 'commitEvent'>,
  event: PortfolioBuyEvent,
  value: FundValue,
  now: string,
  options?: Omit<CommitEventInput, 'event'>,
): BuyTransactionResult {
  if (
    value.date !== event.navDate ||
    !isHistoricalDate(value.date) ||
    !Number.isFinite(value.unitNav) ||
    value.unitNav <= 0
  ) {
    return { ok: false, reason: 'exact-nav-mismatch' }
  }

  return coordinator.commitEvent({
    ...options,
    event: {
      ...event,
      settlementStatus: isSettled(event.confirmedDate, event.units)
        ? 'settled'
        : 'pending-settlement',
      unitNav: { confidence: 'actual', source: value.source, value: value.unitNav },
      updatedAt: now,
    },
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
