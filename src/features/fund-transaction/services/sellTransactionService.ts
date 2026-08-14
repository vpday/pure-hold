import type {
  MoneyFieldValue,
  NavFieldValue,
  PortfolioSellEvent,
} from '@/domains/portfolio/models/index.ts'
import type { PortfolioCommandResult, PortfolioStore } from '@/domains/portfolio/stores/index.ts'

export interface SellActualFacts {
  readonly netAmount?: MoneyFieldValue
  readonly redemptionFee?: MoneyFieldValue
  readonly unitNav?: NavFieldValue
}

export function saveSellDraft(
  store: Pick<PortfolioStore, 'addEvent'>,
  draft: PortfolioSellEvent,
): PortfolioCommandResult {
  return store.addEvent(draft)
}

export function completeSellEventWithActualFacts(
  store: Pick<PortfolioStore, 'updateEvent'>,
  event: PortfolioSellEvent,
  facts: SellActualFacts,
  now: string,
): PortfolioCommandResult {
  return store.updateEvent({
    ...event,
    ...(facts.netAmount === undefined ? {} : { netAmount: facts.netAmount }),
    ...(facts.redemptionFee === undefined ? {} : { redemptionFee: facts.redemptionFee }),
    ...(facts.unitNav === undefined ? {} : { unitNav: facts.unitNav }),
    updatedAt: now,
  })
}
