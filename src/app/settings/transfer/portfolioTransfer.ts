import type { Portfolio } from '@/domains/portfolio/models/index.ts'
import type { PortfolioCommandResult, PortfolioStore } from '@/domains/portfolio/stores/index.ts'

export type PortfolioTransferResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly error?: unknown
      readonly partialPersistence: boolean
      readonly reason: 'conflict' | 'invalid-portfolio' | 'not-found' | 'persistence-failed'
    }

export interface PortfolioTransferAdapter {
  readonly replace: (incoming: Portfolio) => PortfolioTransferResult
}

export function createPortfolioTransferAdapter(store: PortfolioStore): PortfolioTransferAdapter {
  function replace(incoming: Portfolio): PortfolioTransferResult {
    const previous = store.getPortfolio()

    for (const event of previous.events) {
      const result = store.deleteEvent(event.id)
      if (!result.ok) return recover(result, store, previous)
    }
    for (const fundCode of previous.fundCodes) {
      const result = store.disableFund(fundCode)
      if (!result.ok) return recover(result, store, previous)
    }

    const result = store.mergeCandidate(incoming)
    if (result.ok) return { ok: true }
    return recover(result, store, previous)
  }

  return { replace }
}

function recover(
  result: Extract<PortfolioCommandResult, { readonly ok: false }>,
  store: PortfolioStore,
  previous: Portfolio,
): PortfolioTransferResult {
  const rollback = store.mergeCandidate(previous)
  return {
    error: result.error,
    ok: false,
    partialPersistence: !rollback.ok,
    reason: result.reason,
  }
}
