import {
  createCoordinationFailureFact,
  type CoordinationFailureFact,
} from '@/app/coordination/coordinationFailure.ts'
import type { Portfolio } from '@/domains/portfolio/models/index.ts'
import type { PortfolioCommandResult, PortfolioStore } from '@/domains/portfolio/stores/index.ts'

export type PortfolioTransferResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly failure: CoordinationFailureFact
      readonly reason: 'conflict' | 'invalid-portfolio' | 'not-found' | 'persistence-failed'
    }

export interface PortfolioTransferAdapter {
  readonly replace: (incoming: Portfolio) => PortfolioTransferResult
}

export function createPortfolioTransferAdapter(store: PortfolioStore): PortfolioTransferAdapter {
  function replace(incoming: Portfolio): PortfolioTransferResult {
    const previous = store.getPortfolio()
    let changed = false

    for (const event of previous.events) {
      const result = store.deleteEvent(event.id)
      if (!result.ok) return recover(result, store, previous, changed)
      changed = true
    }
    for (const fundCode of previous.fundCodes) {
      const result = store.disableFund(fundCode)
      if (!result.ok) return recover(result, store, previous, changed)
      changed = true
    }

    const result = store.mergeCandidate(incoming)
    if (result.ok) return { ok: true }
    return recover(result, store, previous, changed)
  }

  return { replace }
}

function recover(
  result: Extract<PortfolioCommandResult, { readonly ok: false }>,
  store: PortfolioStore,
  previous: Portfolio,
  changed: boolean,
): PortfolioTransferResult {
  if (!changed) {
    return {
      failure: createCoordinationFailureFact('unchanged', result.error),
      ok: false,
      reason: result.reason,
    }
  }

  const rollback = store.mergeCandidate(previous)
  return {
    failure: createCoordinationFailureFact(
      rollback.ok ? 'restored' : 'partial',
      result.error,
      rollback.ok || rollback.error === undefined ? [] : [rollback.error],
    ),
    ok: false,
    reason: result.reason,
  }
}
