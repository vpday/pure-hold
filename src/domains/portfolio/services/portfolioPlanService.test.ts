import assert from 'node:assert/strict'
import test from 'node:test'

import type { Portfolio, PortfolioPlan } from '../models/index.ts'
import { createPortfolioStore } from '../stores/createPortfolioStore.ts'
import {
  createPendingPlanBuyEvent,
  deletePortfolioPlan,
  deferPlanInstallment,
  ensurePlanInstallment,
  executePlanInstallment,
  getNextPlanOccurrenceDate,
  getPlanOccurrenceDates,
  planInstallmentId,
  syncLocalDraftPlans,
  synchronizeInstallmentAfterEvent,
  updatePlanInstallmentStatus,
} from './portfolioPlanService.ts'

function plan(overrides: Partial<PortfolioPlan> = {}): PortfolioPlan {
  return {
    amountCents: 50_000,
    createdAt: '2026-08-01T09:00:00.000Z',
    cycle: 'monthly',
    executionDay: 31,
    executionMode: 'manual',
    fundCode: '000001',
    id: 'plan-1',
    startDate: '2026-01-01',
    status: 'active',
    updatedAt: '2026-08-01T09:00:00.000Z',
    ...overrides,
  }
}

function store(initial: Portfolio = { events: [], fundCodes: [], installments: [], plans: [] }) {
  return createPortfolioStore(initial, () => undefined)
}

test('generates weekly dates and clamps monthly dates to month ends including leap years', () => {
  assert.deepEqual(
    getPlanOccurrenceDates(plan({ cycle: 'weekly', executionDay: 1, startDate: '2026-08-03' }), {
      fromDate: '2026-08-03',
      toDate: '2026-08-24',
    }),
    ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24'],
  )
  assert.deepEqual(
    getPlanOccurrenceDates(plan(), { fromDate: '2026-01-01', toDate: '2026-04-01' }),
    ['2026-03-31'],
  )
  assert.deepEqual(
    getPlanOccurrenceDates(plan(), { fromDate: '2028-01-01', toDate: '2028-03-01' }),
    ['2028-01-31', '2028-02-29'],
  )
})

test('does not generate dates outside plan bounds and exposes the next occurrence', () => {
  const bounded = plan({ endDate: '2026-04-10' })
  assert.deepEqual(
    getPlanOccurrenceDates(bounded, { fromDate: '2025-01-01', toDate: '2027-01-01' }),
    ['2026-03-31'],
  )
  assert.equal(getNextPlanOccurrenceDate(bounded, '2026-02-01'), '2026-03-31')
  assert.equal(getNextPlanOccurrenceDate(bounded, '2026-04-11'), undefined)
})

test('filters daily, weekly, and monthly candidates without shifting them', () => {
  assert.deepEqual(
    getPlanOccurrenceDates(plan({ cycle: 'daily', executionDay: 1, startDate: '2026-01-01' }), {
      fromDate: '2026-01-01',
      toDate: '2026-01-05',
    }),
    ['2026-01-05'],
  )
  assert.deepEqual(
    getPlanOccurrenceDates(plan({ cycle: 'weekly', executionDay: 5, startDate: '2026-04-24' }), {
      fromDate: '2026-04-24',
      toDate: '2026-05-08',
    }),
    ['2026-04-24', '2026-05-08'],
  )
  assert.deepEqual(
    getPlanOccurrenceDates(plan({ cycle: 'monthly', executionDay: 1, startDate: '2026-01-01' }), {
      fromDate: '2026-01-01',
      toDate: '2026-02-05',
    }),
    [],
  )
  assert.equal(
    getNextPlanOccurrenceDate(
      plan({ cycle: 'daily', executionDay: 1, startDate: '2026-01-01' }),
      '2026-01-01',
    ),
    '2026-01-05',
  )
})

test('manual plans do not create a first draft until execution is explicit', () => {
  const current = store()
  assert.equal(current.getPortfolio().installments.length, 0)
  assert.equal(current.addPlan(plan()).ok, true)
  const result = executePlanInstallment(
    {
      addEvent: current.addEvent,
      addInstallment: current.addInstallment,
      deleteInstallment: current.deleteInstallment,
      getPortfolio: current.getPortfolio,
    },
    plan(),
    '2026-08-31',
    '2026-08-14T09:00:00.000Z',
  )
  assert.equal(result.ok, true)
  const repeated = executePlanInstallment(
    {
      addEvent: current.addEvent,
      addInstallment: current.addInstallment,
      deleteInstallment: current.deleteInstallment,
      getPortfolio: current.getPortfolio,
    },
    plan(),
    '2026-08-31',
    '2026-08-14T09:00:00.000Z',
  )
  assert.equal(repeated.ok, true)
  assert.equal(current.getPortfolio().installments.length, 1)
  assert.equal(current.getPortfolio().events[0]?.settlementStatus, 'pending-settlement')
})

test('local drafts are idempotent and retain historical executed events', () => {
  const current = store()
  assert.equal(current.addPlan(plan({ executionDay: 5, executionMode: 'local-draft' })).ok, true)
  const first = syncLocalDraftPlans(current, '2026-03-31', '2026-03-31T09:00:00.000Z')
  assert.equal(first.length, 3)
  assert.equal(current.getPortfolio().events.length, 3)
  assert.equal(current.getPortfolio().installments.length, 3)

  const second = syncLocalDraftPlans(current, '2026-03-31', '2026-03-31T10:00:00.000Z')
  assert.equal(second.length, 3)
  assert.equal(current.getPortfolio().events.length, 3)
  assert.equal(current.getPortfolio().installments.length, 3)
  const firstEvent = current.getPortfolio().events[0]
  if (firstEvent?.kind !== 'buy') throw new Error('expected buy event')
  const settled = current.updateEvent({ ...firstEvent, settlementStatus: 'settled' })
  assert.equal(settled.ok, true)
  assert.equal(
    synchronizeInstallmentAfterEvent(
      current,
      { ...firstEvent, settlementStatus: 'settled' },
      '2026-04-01T09:00:00.000Z',
    )?.ok,
    true,
  )
  assert.equal(
    current.getPortfolio().installments.find(({ id }) => id === firstEvent.installmentId)?.status,
    'executed',
  )
  assert.equal(current.getPortfolio().events.length, 3)
})

test('defer records an actual date while skip and cancel do not create events', () => {
  const current = store()
  const currentPlan = plan()
  assert.equal(current.addPlan(currentPlan).ok, true)
  const created = executePlanInstallment(
    current,
    currentPlan,
    '2026-03-31',
    '2026-03-01T09:00:00.000Z',
  )
  if (!created.ok) throw new Error('expected installment')
  assert.equal(
    deferPlanInstallment(current, created.installment.id, '2026-02-02', '2026-02-02T09:00:00.000Z')
      .ok,
    true,
  )
  assert.equal(current.getPortfolio().installments[0]?.confirmedDate, '2026-02-02')
  assert.equal(current.getPortfolio().events[0]?.confirmedDate, '2026-02-02')
  assert.equal(
    updatePlanInstallmentStatus(
      current,
      created.installment.id,
      'skipped',
      '2026-02-03T09:00:00.000Z',
    ).ok,
    true,
  )
  assert.equal(current.getPortfolio().events.length, 0)
  const skippedOnly = ensurePlanInstallment(
    current,
    currentPlan,
    '2026-04-30',
    '2026-02-03T09:00:00.000Z',
  )
  if (!skippedOnly.ok) throw new Error('expected second installment')
  assert.equal(
    updatePlanInstallmentStatus(
      current,
      skippedOnly.installment.id,
      'cancelled',
      '2026-02-03T09:00:00.000Z',
    ).ok,
    true,
  )
  assert.equal(current.getPortfolio().events.length, 0)
  assert.equal(planInstallmentId(currentPlan.id, '2026-03-31'), created.installment.id)
  assert.equal(
    createPendingPlanBuyEvent(currentPlan, created.installment, '2026-01-01T09:00:00.000Z').id,
    created.event?.id,
  )
})

test('deleting a plan removes pending artifacts but keeps settled buys as standalone history', () => {
  const current = store()
  const currentPlan = plan()
  assert.equal(current.addPlan(currentPlan).ok, true)
  const created = executePlanInstallment(
    current,
    currentPlan,
    '2026-03-31',
    '2026-03-01T09:00:00.000Z',
  )
  if (!created.ok || created.event === undefined) throw new Error('expected plan buy')
  const settled = current.updateEvent({ ...created.event, settlementStatus: 'settled' })
  assert.equal(settled.ok, true)

  const result = deletePortfolioPlan(current, currentPlan.id, '2026-02-01T09:00:00.000Z')

  assert.equal(result.ok, true)
  assert.equal(current.getPortfolio().plans.length, 0)
  assert.equal(current.getPortfolio().installments.length, 0)
  assert.equal(current.getPortfolio().events.length, 1)
  const retained = current.getPortfolio().events[0]
  assert.equal(retained?.kind, 'buy')
  assert.equal(retained?.source, 'manual')
  assert.equal(retained?.planId, undefined)
})
