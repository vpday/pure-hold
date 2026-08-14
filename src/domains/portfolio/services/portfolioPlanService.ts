import type {
  FieldValue,
  PortfolioBuyEvent,
  PortfolioEvent,
  PortfolioInstallment,
  PortfolioPlan,
} from '../models/index.ts'
import type { PortfolioCommandResult, PortfolioStore } from '../stores/index.ts'

export interface PlanDateRange {
  readonly fromDate: string
  readonly toDate: string
}

export type PlanOperationResult =
  | {
      readonly ok: true
      readonly portfolio: ReturnType<PortfolioStore['getPortfolio']>
      readonly installment: PortfolioInstallment
      readonly event?: PortfolioBuyEvent
    }
  | {
      readonly ok: false
      readonly reason: 'invalid-date' | 'installment-not-pending' | 'persistence-failed'
      readonly error?: unknown
      readonly portfolio: ReturnType<PortfolioStore['getPortfolio']>
    }

export function planInstallmentId(planId: string, plannedDate: string): string {
  return `installment:${planId}:${plannedDate}`
}

export function planBuyEventId(planId: string, installmentId: string): string {
  return `plan-buy:${planId}:${installmentId}`
}

export function getPlanOccurrenceDates(
  plan: PortfolioPlan,
  range: PlanDateRange,
): readonly string[] {
  const fromDate = maxDate(plan.startDate, range.fromDate)
  const toDate = minDate(plan.endDate ?? range.toDate, range.toDate)
  if (fromDate === undefined || toDate === undefined || fromDate > toDate) return []

  return plan.cycle === 'weekly'
    ? getWeeklyDates(plan.executionDay, fromDate, toDate)
    : getMonthlyDates(plan.executionDay, fromDate, toDate)
}

export function getNextPlanOccurrenceDate(
  plan: PortfolioPlan,
  fromDate: string,
): string | undefined {
  const firstDate = maxDate(plan.startDate, fromDate)
  if (firstDate === undefined || (plan.endDate !== undefined && firstDate > plan.endDate)) {
    return undefined
  }

  if (plan.cycle === 'weekly') {
    const first = parseDate(firstDate)
    const currentDay = weekdayNumber(first)
    const offset = (plan.executionDay - currentDay + 7) % 7
    const candidate = formatDate(addDays(first, offset))
    return plan.endDate !== undefined && candidate > plan.endDate ? undefined : candidate
  }

  const first = parseDate(firstDate)
  let candidate = monthlyDate(first.getUTCFullYear(), first.getUTCMonth(), plan.executionDay)
  if (candidate < firstDate) {
    candidate = monthlyDate(first.getUTCFullYear(), first.getUTCMonth() + 1, plan.executionDay)
  }
  return plan.endDate !== undefined && candidate > plan.endDate ? undefined : candidate
}

export function createPlanInstallment(
  plan: PortfolioPlan,
  plannedDate: string,
  now: string,
): PortfolioInstallment {
  return {
    createdAt: now,
    fundCode: plan.fundCode,
    id: planInstallmentId(plan.id, plannedDate),
    planId: plan.id,
    plannedDate,
    status: 'pending',
    updatedAt: now,
  }
}

export function createPendingPlanBuyEvent(
  plan: PortfolioPlan,
  installment: PortfolioInstallment,
  now: string,
): PortfolioBuyEvent {
  const purchaseFeeRate =
    plan.purchaseFeeRate === undefined
      ? unknownField('fund-basic-info')
      : actualField(plan.purchaseFeeRate, 'manual')
  return {
    auditedAt: now,
    confirmedDate: installment.confirmedDate ?? installment.plannedDate,
    createdAt: now,
    fundCode: plan.fundCode,
    id: planBuyEventId(plan.id, installment.id),
    installmentId: installment.id,
    kind: 'buy',
    planId: plan.id,
    purchaseFee: unknownField('manual'),
    purchaseFeeRate,
    settlementStatus: 'pending-settlement',
    source: 'plan',
    totalAmount: actualField(plan.amountCents, 'manual'),
    unitNav: unknownField('manual'),
    units: unknownField('manual'),
    updatedAt: now,
  }
}

export function ensurePlanInstallment(
  store: Pick<PortfolioStore, 'addInstallment' | 'getPortfolio'>,
  plan: PortfolioPlan,
  plannedDate: string,
  now: string,
): PlanOperationResult {
  if (
    !getPlanOccurrenceDates(plan, { fromDate: plannedDate, toDate: plannedDate }).includes(
      plannedDate,
    )
  ) {
    return { ok: false, portfolio: store.getPortfolio(), reason: 'invalid-date' }
  }

  const portfolio = store.getPortfolio()
  const existing = portfolio.installments.find(
    (installment) => installment.planId === plan.id && installment.plannedDate === plannedDate,
  )
  if (existing !== undefined) return { installment: existing, ok: true, portfolio }

  const installment = createPlanInstallment(plan, plannedDate, now)
  const result = store.addInstallment(installment)
  if (!result.ok) {
    return {
      error: result.error,
      ok: false,
      portfolio: store.getPortfolio(),
      reason: 'persistence-failed',
    }
  }
  return {
    installment:
      result.portfolio.installments.find(({ id }) => id === installment.id) ?? installment,
    ok: true,
    portfolio: result.portfolio,
  }
}

export function executePlanInstallment(
  store: Pick<PortfolioStore, 'addEvent' | 'addInstallment' | 'deleteInstallment' | 'getPortfolio'>,
  plan: PortfolioPlan,
  plannedDate: string,
  now: string,
): PlanOperationResult {
  const ensured = ensurePlanInstallment(store, plan, plannedDate, now)
  if (!ensured.ok) return ensured
  if (ensured.installment.status !== 'pending') {
    return {
      ok: false,
      portfolio: store.getPortfolio(),
      reason: 'installment-not-pending',
    }
  }

  const portfolio = store.getPortfolio()
  const existingEvent = findPlanBuyEvent(portfolio.events, plan.id, ensured.installment.id)
  if (existingEvent !== undefined) {
    return {
      event: existingEvent,
      installment: ensured.installment,
      ok: true,
      portfolio,
    }
  }

  const event = createPendingPlanBuyEvent(plan, ensured.installment, now)
  const result = store.addEvent(event)
  if (!result.ok) {
    return {
      error: result.error,
      ok: false,
      portfolio: store.getPortfolio(),
      reason: 'persistence-failed',
    }
  }
  return {
    event,
    installment:
      result.portfolio.installments.find(({ id }) => id === ensured.installment.id) ??
      ensured.installment,
    ok: true,
    portfolio: result.portfolio,
  }
}

export function syncLocalDraftPlans(
  store: Pick<
    PortfolioStore,
    'addEvent' | 'addInstallment' | 'deleteInstallment' | 'getPortfolio' | 'updateInstallment'
  >,
  today: string,
  now: string,
): readonly PlanOperationResult[] {
  const results: PlanOperationResult[] = []
  for (const plan of store.getPortfolio().plans) {
    if (plan.status !== 'active' || plan.executionMode !== 'local-draft') continue
    for (const plannedDate of getPlanOccurrenceDates(plan, {
      fromDate: plan.startDate,
      toDate: today,
    })) {
      const current = store.getPortfolio()
      const existing = current.installments.find(
        (installment) => installment.planId === plan.id && installment.plannedDate === plannedDate,
      )
      if (existing?.status === 'skipped' || existing?.status === 'cancelled') continue

      const result = executePlanInstallment(store, plan, plannedDate, now)
      results.push(result)
      if (!result.ok || result.event === undefined) continue
      if (result.event.settlementStatus === 'settled') {
        synchronizeInstallmentAfterEvent(store, result.event, now)
      }
    }
  }
  return results
}

export function synchronizeInstallmentAfterEvent(
  store: Pick<PortfolioStore, 'getPortfolio' | 'updateInstallment'>,
  event: PortfolioEvent,
  now: string,
): PortfolioCommandResult | undefined {
  if (
    event.kind !== 'buy' ||
    event.planId === undefined ||
    event.installmentId === undefined ||
    event.settlementStatus !== 'settled'
  ) {
    return undefined
  }
  const installment = store.getPortfolio().installments.find(({ id }) => id === event.installmentId)
  if (installment === undefined || installment.status === 'executed') return undefined
  return store.updateInstallment({
    ...installment,
    confirmedDate:
      event.confirmedDate === installment.plannedDate
        ? installment.confirmedDate
        : event.confirmedDate,
    status: 'executed',
    updatedAt: now,
  })
}

export function updatePlanInstallmentStatus(
  store: Pick<PortfolioStore, 'deleteEvent' | 'getPortfolio' | 'updateInstallment'>,
  installmentId: string,
  status: 'cancelled' | 'skipped',
  now: string,
): PortfolioCommandResult {
  const portfolio = store.getPortfolio()
  const installment = portfolio.installments.find(({ id }) => id === installmentId)
  if (installment === undefined) return { ok: false, reason: 'not-found' }
  if (installment.status === 'executed') return { ok: false, reason: 'conflict' }
  const event = portfolio.events.find(
    (candidate) => candidate.kind === 'buy' && candidate.installmentId === installmentId,
  )
  if (event?.kind === 'buy' && event.settlementStatus === 'settled') {
    return { ok: false, reason: 'conflict' }
  }

  const updated = store.updateInstallment({ ...installment, status, updatedAt: now })
  if (!updated.ok || event === undefined) return updated
  const deleted = store.deleteEvent(event.id)
  if (deleted.ok) return deleted
  store.updateInstallment(installment)
  return deleted
}

export function deletePortfolioPlan(
  store: Pick<
    PortfolioStore,
    'deleteEvent' | 'deleteInstallment' | 'deletePlan' | 'getPortfolio' | 'updateEvent'
  >,
  planId: string,
  now: string,
): PortfolioCommandResult {
  const portfolio = store.getPortfolio()
  if (!portfolio.plans.some(({ id }) => id === planId)) return { ok: true, portfolio }

  for (const event of portfolio.events.filter((candidate) => candidate.planId === planId)) {
    const result =
      event.kind === 'buy' && event.settlementStatus === 'settled'
        ? store.updateEvent({
            ...event,
            installmentId: undefined,
            planId: undefined,
            source: 'manual',
            updatedAt: now,
          })
        : store.deleteEvent(event.id)
    if (!result.ok) return result
  }
  for (const installment of portfolio.installments.filter(({ planId: id }) => id === planId)) {
    const result = store.deleteInstallment(installment.id)
    if (!result.ok) return result
  }
  return store.deletePlan(planId)
}

export function deferPlanInstallment(
  store: Pick<PortfolioStore, 'getPortfolio' | 'updateEvent' | 'updateInstallment'>,
  installmentId: string,
  confirmedDate: string,
  now: string,
): PortfolioCommandResult {
  const portfolio = store.getPortfolio()
  const installment = portfolio.installments.find(({ id }) => id === installmentId)
  if (installment === undefined) return { ok: false, reason: 'not-found' }
  const updatedInstallment = store.updateInstallment({
    ...installment,
    confirmedDate,
    updatedAt: now,
  })
  if (!updatedInstallment.ok) return updatedInstallment

  const event = portfolio.events.find(
    (candidate): candidate is PortfolioBuyEvent =>
      candidate.kind === 'buy' && candidate.installmentId === installmentId,
  )
  if (event === undefined || event.settlementStatus === 'settled') return updatedInstallment
  return store.updateEvent({ ...event, confirmedDate, updatedAt: now })
}

function findPlanBuyEvent(
  events: readonly PortfolioEvent[],
  planId: string,
  installmentId: string,
): PortfolioBuyEvent | undefined {
  return events.find(
    (event): event is PortfolioBuyEvent =>
      event.kind === 'buy' && event.planId === planId && event.installmentId === installmentId,
  )
}

function getWeeklyDates(executionDay: number, fromDate: string, toDate: string): readonly string[] {
  const dates: string[] = []
  let cursor = parseDate(fromDate)
  const end = parseDate(toDate)
  while (cursor <= end) {
    if (weekdayNumber(cursor) === executionDay) dates.push(formatDate(cursor))
    cursor = addDays(cursor, 1)
  }
  return dates
}

function getMonthlyDates(
  executionDay: number,
  fromDate: string,
  toDate: string,
): readonly string[] {
  const dates: string[] = []
  const from = parseDate(fromDate)
  const end = parseDate(toDate)
  let year = from.getUTCFullYear()
  let month = from.getUTCMonth()
  while (true) {
    const candidate = monthlyDate(year, month, executionDay)
    if (candidate >= fromDate && candidate <= toDate) dates.push(candidate)
    if (candidate > toDate) break
    month += 1
    if (month === 12) {
      year += 1
      month = 0
    }
    if (Date.UTC(year, month, 1) > end.getTime()) break
  }
  return dates
}

function monthlyDate(year: number, month: number, executionDay: number): string {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return formatDate(new Date(Date.UTC(year, month, Math.min(executionDay, lastDay))))
}

function weekdayNumber(date: Date): number {
  const day = date.getUTCDay()
  return day === 0 ? 7 : day
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + amount)
  return result
}

function maxDate(left: string, right: string): string | undefined {
  return isDate(left) && isDate(right) ? (left > right ? left : right) : undefined
}

function minDate(left: string, right: string): string | undefined {
  return isDate(left) && isDate(right) ? (left < right ? left : right) : undefined
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && parseDate(value).toISOString().slice(0, 10) === value
}

function actualField(value: number, source: 'manual'): FieldValue<number> {
  return { confidence: 'actual', source, value }
}

function unknownField(source: 'fund-basic-info' | 'manual'): FieldValue<number> {
  return { confidence: 'unknown', source, value: null }
}
