import {
  type Portfolio,
  type PortfolioEvent,
  type PortfolioInstallment,
  type PortfolioPlan,
} from '../models/index.ts'
import {
  calculatePortfolio,
  type CurrentNavByFund,
  type PortfolioCalculation,
} from '../services/calculatePortfolio.ts'
import { validateAndClonePortfolio } from '../services/persistence/validatePortfolioPersistence.ts'

export type PortfolioWriter = (portfolio: Portfolio) => void

export type PortfolioCommandFailure =
  | 'conflict'
  | 'invalid-portfolio'
  | 'not-found'
  | 'persistence-failed'

export type PortfolioCommandResult =
  | { readonly ok: true; readonly portfolio: Portfolio; readonly reason?: undefined }
  | { readonly ok: false; readonly reason: PortfolioCommandFailure; readonly error?: unknown }

export interface PortfolioStore {
  readonly addEvent: (event: PortfolioEvent) => PortfolioCommandResult
  readonly addInstallment: (installment: PortfolioInstallment) => PortfolioCommandResult
  readonly addPlan: (plan: PortfolioPlan) => PortfolioCommandResult
  readonly calculate: (input: PortfolioCalculationInput) => PortfolioCalculation
  readonly deleteEvent: (eventId: string) => PortfolioCommandResult
  readonly deleteInstallment: (installmentId: string) => PortfolioCommandResult
  readonly deletePlan: (planId: string) => PortfolioCommandResult
  readonly disableFund: (fundCode: string) => PortfolioCommandResult
  readonly enableFund: (fundCode: string) => PortfolioCommandResult
  readonly getPortfolio: () => Portfolio
  readonly mergeCandidate: (candidate: Portfolio) => PortfolioCommandResult
  readonly settleEvent: (event: PortfolioEvent) => PortfolioCommandResult
  readonly updateEvent: (event: PortfolioEvent) => PortfolioCommandResult
  readonly updateInstallment: (installment: PortfolioInstallment) => PortfolioCommandResult
  readonly updatePlan: (plan: PortfolioPlan) => PortfolioCommandResult
}

export interface PortfolioCalculationInput {
  readonly asOfDate: string
  readonly currentNavByFund: CurrentNavByFund
}

export function createPortfolioStore(
  initialPortfolio: Portfolio,
  writer: PortfolioWriter,
): PortfolioStore {
  let current = validateAndClonePortfolio(initialPortfolio)

  function getPortfolio(): Portfolio {
    return validateAndClonePortfolio(current)
  }

  function enableFund(fundCode: string): PortfolioCommandResult {
    if (current.fundCodes.includes(fundCode)) return success(current)
    return commit({ ...current, fundCodes: [...current.fundCodes, fundCode] })
  }

  function disableFund(fundCode: string): PortfolioCommandResult {
    if (!current.fundCodes.includes(fundCode)) return success(current)
    return commit({
      ...current,
      fundCodes: current.fundCodes.filter((code) => code !== fundCode),
    })
  }

  function addEvent(event: PortfolioEvent): PortfolioCommandResult {
    return addById('events', event, current.events, (events) => ({ ...current, events }))
  }

  function updateEvent(event: PortfolioEvent): PortfolioCommandResult {
    return updateById('events', event, current.events, (events) => ({ ...current, events }))
  }

  function settleEvent(event: PortfolioEvent): PortfolioCommandResult {
    return updateEvent({ ...event, settlementStatus: 'settled' })
  }

  function deleteEvent(eventId: string): PortfolioCommandResult {
    return deleteById(eventId, current.events, (events) => ({ ...current, events }))
  }

  function addPlan(plan: PortfolioPlan): PortfolioCommandResult {
    return addById('plans', plan, current.plans, (plans) => ({ ...current, plans }))
  }

  function updatePlan(plan: PortfolioPlan): PortfolioCommandResult {
    return updateById('plans', plan, current.plans, (plans) => ({ ...current, plans }))
  }

  function deletePlan(planId: string): PortfolioCommandResult {
    return deleteById(planId, current.plans, (plans) => ({ ...current, plans }))
  }

  function addInstallment(installment: PortfolioInstallment): PortfolioCommandResult {
    return addById('installments', installment, current.installments, (installments) => ({
      ...current,
      installments,
    }))
  }

  function updateInstallment(installment: PortfolioInstallment): PortfolioCommandResult {
    return updateById('installments', installment, current.installments, (installments) => ({
      ...current,
      installments,
    }))
  }

  function deleteInstallment(installmentId: string): PortfolioCommandResult {
    return deleteById(installmentId, current.installments, (installments) => ({
      ...current,
      installments,
    }))
  }

  function mergeCandidate(candidate: Portfolio): PortfolioCommandResult {
    let validated: Portfolio
    try {
      validated = validateAndClonePortfolio(candidate)
    } catch (error) {
      return failure('invalid-portfolio', error)
    }

    const merged = mergeCollection(current.events, validated.events)
    if (!merged.ok) return failure(merged.reason, merged.error)
    const plans = mergeCollection(current.plans, validated.plans)
    if (!plans.ok) return failure(plans.reason, plans.error)
    const installments = mergeCollection(current.installments, validated.installments)
    if (!installments.ok) return failure(installments.reason, installments.error)

    return commit({
      events: merged.items,
      fundCodes: unique([...current.fundCodes, ...validated.fundCodes]),
      installments: installments.items,
      plans: plans.items,
    })
  }

  function calculate(input: PortfolioCalculationInput): PortfolioCalculation {
    return calculatePortfolio({ ...input, events: current.events })
  }

  function commit(candidate: Portfolio): PortfolioCommandResult {
    let validated: Portfolio
    try {
      validated = validateAndClonePortfolio(candidate)
    } catch (error) {
      return failure('invalid-portfolio', error)
    }
    if (stableSerialize(validated) === stableSerialize(current)) return success(current)

    try {
      writer(validated)
    } catch (error) {
      return failure('persistence-failed', error)
    }

    current = validateAndClonePortfolio(validated)
    return success(current)
  }

  return {
    addEvent,
    addInstallment,
    addPlan,
    calculate,
    deleteEvent,
    deleteInstallment,
    deletePlan,
    disableFund,
    enableFund,
    getPortfolio,
    mergeCandidate,
    settleEvent,
    updateEvent,
    updateInstallment,
    updatePlan,
  }

  function addById<T extends { readonly id: string }>(
    label: string,
    item: T,
    items: readonly T[],
    createCandidate: (items: readonly T[]) => Portfolio,
  ): PortfolioCommandResult {
    const existingIndex = items.findIndex(({ id }) => id === item.id)
    if (existingIndex >= 0) {
      const candidateItems = [...items]
      candidateItems[existingIndex] = item
      let candidate: Portfolio
      try {
        candidate = validateAndClonePortfolio(createCandidate(candidateItems))
      } catch (error) {
        return failure('invalid-portfolio', error)
      }
      return stableSerialize(candidate) === stableSerialize(current)
        ? success(current)
        : failure('conflict', new Error(`Portfolio ${label} ID conflicts`))
    }
    return commit(createCandidate([...items, item]))
  }

  function updateById<T extends { readonly id: string }>(
    _label: string,
    item: T,
    items: readonly T[],
    createCandidate: (items: readonly T[]) => Portfolio,
  ): PortfolioCommandResult {
    const index = items.findIndex(({ id }) => id === item.id)
    if (index < 0) return failure('not-found')
    const next = [...items]
    next[index] = item
    return commit(createCandidate(next))
  }

  function deleteById<T extends { readonly id: string }>(
    id: string,
    items: readonly T[],
    createCandidate: (items: readonly T[]) => Portfolio,
  ): PortfolioCommandResult {
    if (!items.some((item) => item.id === id)) return success(current)
    return commit(createCandidate(items.filter((item) => item.id !== id)))
  }
}

function mergeCollection<T extends { readonly id: string }>(
  current: readonly T[],
  incoming: readonly T[],
): MergeResult<T> {
  const items = [...current]
  for (const item of incoming) {
    const index = items.findIndex(({ id }) => id === item.id)
    if (index < 0) {
      items.push(item)
      continue
    }
    if (stableSerialize(items[index]) !== stableSerialize(item)) {
      return {
        error: new Error(`Portfolio ID ${item.id} conflicts`),
        ok: false,
        reason: 'conflict',
      }
    }
  }
  return { items, ok: true }
}

type MergeResult<T> =
  | { readonly ok: true; readonly items: readonly T[] }
  | { readonly ok: false; readonly reason: 'conflict'; readonly error: Error }

function success(portfolio: Portfolio): PortfolioCommandResult {
  return { ok: true, portfolio: validateAndClonePortfolio(portfolio) }
}

function failure(reason: PortfolioCommandFailure, error?: unknown): PortfolioCommandResult {
  return error === undefined ? { ok: false, reason } : { error, ok: false, reason }
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)]
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
