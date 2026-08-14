import type { Portfolio } from '@/domains/portfolio/models/index.ts'
import type { PortfolioCommandResult, PortfolioStore } from '@/domains/portfolio/stores/index.ts'

export interface PortfolioTransferConflict {
  readonly collection: 'events' | 'installments' | 'plans'
  readonly id: string
}

export type PortfolioTransferResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly conflicts?: readonly PortfolioTransferConflict[]
      readonly error?: unknown
      readonly partialPersistence: boolean
      readonly reason: 'conflict' | 'invalid-portfolio' | 'not-found' | 'persistence-failed'
    }

export interface PortfolioTransferAdapter {
  readonly merge: (incoming: Portfolio) => PortfolioTransferResult
  readonly replace: (incoming: Portfolio) => PortfolioTransferResult
}

export function createPortfolioTransferAdapter(store: PortfolioStore): PortfolioTransferAdapter {
  function merge(incoming: Portfolio): PortfolioTransferResult {
    const conflicts = findConflicts(store.getPortfolio(), incoming)
    if (conflicts.length > 0) {
      return { conflicts, ok: false, partialPersistence: false, reason: 'conflict' }
    }
    return mapCommandResult(store.mergeCandidate(incoming))
  }

  function replace(incoming: Portfolio): PortfolioTransferResult {
    const previous = store.getPortfolio()

    for (const event of previous.events) {
      const result = store.deleteEvent(event.id)
      if (!result.ok) return recover(result, store, previous)
    }
    for (const installment of previous.installments) {
      const result = store.deleteInstallment(installment.id)
      if (!result.ok) return recover(result, store, previous)
    }
    for (const plan of previous.plans) {
      const result = store.deletePlan(plan.id)
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

  return { merge, replace }
}

function findConflicts(current: Portfolio, incoming: Portfolio): PortfolioTransferConflict[] {
  return [
    ...findCollectionConflicts('events', current.events, incoming.events),
    ...findCollectionConflicts('installments', current.installments, incoming.installments),
    ...findCollectionConflicts('plans', current.plans, incoming.plans),
  ]
}

function findCollectionConflicts<T extends { readonly id: string }>(
  collection: PortfolioTransferConflict['collection'],
  current: readonly T[],
  incoming: readonly T[],
): PortfolioTransferConflict[] {
  const currentById = new Map(current.map((item) => [item.id, stableSerialize(item)]))
  return incoming.flatMap((item) => {
    const currentValue = currentById.get(item.id)
    return currentValue !== undefined && currentValue !== stableSerialize(item)
      ? [{ collection, id: item.id }]
      : []
  })
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

function mapCommandResult(result: PortfolioCommandResult): PortfolioTransferResult {
  if (result.ok) return { ok: true }
  return {
    error: result.error,
    ok: false,
    partialPersistence: false,
    reason: result.reason,
  }
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    )
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
