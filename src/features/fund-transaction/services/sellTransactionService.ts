import type { FundValue } from '@/domains/funds/services/tiantian/lookupExactUnitNav.ts'
import type {
  CommitEventInput,
  PortfolioCoordinationResult,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import type {
  MoneyFieldValue,
  NavFieldValue,
  PortfolioSellEvent,
  UnitsFieldValue,
} from '@/domains/portfolio/models/index.ts'
import { getShanghaiDate } from '@/domains/portfolio/services/tradingCalendar.ts'

export type SellTransactionFailureReason = 'exact-nav-mismatch'

export type SellTransactionResult =
  | PortfolioCoordinationResult
  | { readonly ok: false; readonly reason: SellTransactionFailureReason }

export interface SellActualFacts {
  readonly confirmedDate?: string
  readonly grossAmount?: MoneyFieldValue
  readonly netAmount?: MoneyFieldValue
  readonly redemptionFee?: MoneyFieldValue
  readonly unitNav?: NavFieldValue
  readonly units?: UnitsFieldValue
}

export function saveSellDraft(
  coordinator: Pick<PortfolioCoordinator, 'commitEvent'>,
  draft: PortfolioSellEvent,
  options?: Omit<CommitEventInput, 'event'>,
): PortfolioCoordinationResult {
  return coordinator.commitEvent({ ...options, event: draft })
}

export function updateSellDraft(
  coordinator: Pick<PortfolioCoordinator, 'commitEvent'>,
  draft: PortfolioSellEvent,
  options?: Omit<CommitEventInput, 'event'>,
): PortfolioCoordinationResult {
  return coordinator.commitEvent({ ...options, event: draft })
}

export function completeSellEventWithActualFacts(
  coordinator: Pick<PortfolioCoordinator, 'commitEvent'>,
  event: PortfolioSellEvent,
  facts: SellActualFacts,
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
      ...(facts.grossAmount === undefined ? {} : { grossAmount: facts.grossAmount }),
      ...(facts.netAmount === undefined ? {} : { netAmount: facts.netAmount }),
      ...(facts.redemptionFee === undefined ? {} : { redemptionFee: facts.redemptionFee }),
      ...(facts.unitNav === undefined ? {} : { unitNav: facts.unitNav }),
      ...(facts.units === undefined ? {} : { units: facts.units }),
      settlementStatus: isSettled(nextConfirmedDate, nextUnits) ? 'settled' : 'pending-settlement',
      updatedAt: now,
    },
  })
}

export function completeSellEventWithExactNav(
  coordinator: Pick<PortfolioCoordinator, 'commitEvent'>,
  event: PortfolioSellEvent,
  value: FundValue,
  now: string,
  options?: Omit<CommitEventInput, 'event'>,
): SellTransactionResult {
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
