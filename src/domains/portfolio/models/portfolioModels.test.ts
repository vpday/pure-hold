import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPortfolio,
  createPortfolioBatch,
  createPortfolioEvent,
  createPortfolioInstallment,
  createPortfolioPlan,
  validatePortfolio,
} from './index.ts'
import type {
  FieldValue,
  Portfolio,
  PortfolioBatch,
  PortfolioEvent,
  PortfolioInstallment,
  PortfolioPlan,
} from './index.ts'

const actual = (value: number): FieldValue<number> => ({
  confidence: 'actual',
  source: 'manual',
  value,
})

const estimated = (value: number): FieldValue<number> => ({
  confidence: 'estimated',
  source: 'formula',
  value,
})

const unknown = (): FieldValue<number> => ({
  confidence: 'unknown',
  source: 'manual',
  value: null,
})

function event(overrides: Partial<PortfolioEvent> = {}): PortfolioEvent {
  const common = {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-12',
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'event-1',
    settlementStatus: 'pending-settlement',
    source: 'manual',
    updatedAt: '2026-08-13T09:00:00.000Z',
  }
  switch (overrides.kind) {
    case 'sell':
      return { ...common, kind: 'sell', units: unknown(), ...overrides } as PortfolioEvent
    case 'cash-dividend':
      return {
        ...common,
        cashAmount: unknown(),
        kind: 'cash-dividend',
        ...overrides,
      } as PortfolioEvent
    case 'dividend-reinvestment':
      return {
        ...common,
        dividendAmount: unknown(),
        kind: 'dividend-reinvestment',
        unitNav: unknown(),
        units: unknown(),
        ...overrides,
      } as PortfolioEvent
    case 'initial-holding':
      return {
        ...common,
        costAmount: unknown(),
        kind: 'initial-holding',
        units: unknown(),
        ...overrides,
      } as PortfolioEvent
    case 'adjustment':
      return {
        ...common,
        costAmountDelta: unknown(),
        kind: 'adjustment',
        reason: 'reason',
        unitsDelta: unknown(),
        ...overrides,
      } as PortfolioEvent
    default:
      return {
        ...common,
        kind: 'buy',
        purchaseFee: unknown(),
        purchaseFeeRate: actual(1),
        totalAmount: actual(10000),
        unitNav: unknown(),
        units: unknown(),
        ...overrides,
      } as PortfolioEvent
  }
}

function plan(overrides: Partial<PortfolioPlan> = {}): PortfolioPlan {
  return {
    amountCents: 10000,
    createdAt: '2026-08-13T09:00:00.000Z',
    cycle: 'monthly',
    executionDay: 15,
    executionMode: 'manual',
    fundCode: '000001',
    id: 'plan-1',
    startDate: '2026-09-01',
    status: 'active',
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

function installment(overrides: Partial<PortfolioInstallment> = {}): PortfolioInstallment {
  return {
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'installment-1',
    planId: 'plan-1',
    plannedDate: '2026-09-15',
    status: 'pending',
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

test('constructs a portfolio with every event kind and independent plan, installment, and batch objects', () => {
  const events: PortfolioEvent[] = [
    event(),
    event({
      confirmedDate: '2026-08-13',
      id: 'event-2',
      kind: 'sell',
      netAmount: actual(11000),
      redemptionFee: actual(100),
      source: 'manual',
      units: actual(10),
    }),
    event({
      cashAmount: actual(300),
      id: 'event-3',
      kind: 'cash-dividend',
      source: 'manual',
    }),
    event({
      dividendAmount: actual(300),
      id: 'event-4',
      kind: 'dividend-reinvestment',
      source: 'dividend-reinvestment',
      unitNav: actual(1.5),
      units: actual(2),
    }),
    event({
      costAmount: actual(50000),
      id: 'event-5',
      kind: 'initial-holding',
      source: 'initial-holding',
      units: actual(50),
    }),
    event({
      costAmountDelta: actual(-100),
      id: 'event-6',
      kind: 'adjustment',
      reason: '平台对账修正',
      source: 'adjustment',
      unitsDelta: actual(-1),
    }),
  ]
  const input: Portfolio = {
    events,
    fundCodes: ['000001'],
    installments: [installment()],
    plans: [plan()],
  }
  const batch: PortfolioBatch = {
    confirmedDate: '2026-08-12',
    costAmount: actual(10000),
    eventId: 'event-1',
    fundCode: '000001',
    id: 'batch-1',
    units: estimated(49.5),
  }

  const result = createPortfolio(input)
  const resultBatch = createPortfolioBatch(batch)
  const resultPlan = createPortfolioPlan(input.plans[0])
  const resultInstallment = createPortfolioInstallment(input.installments[0])
  const resultEvent = createPortfolioEvent(input.events[0])

  assert.deepEqual(result, input)
  assert.deepEqual(resultBatch, batch)
  assert.deepEqual(resultPlan, input.plans[0])
  assert.deepEqual(resultInstallment, input.installments[0])
  assert.deepEqual(resultEvent, input.events[0])
  assert.notStrictEqual(result.events, input.events)
  const resultBuy = result.events[0]
  const inputBuy = input.events[0]
  if (resultBuy.kind !== 'buy' || inputBuy.kind !== 'buy') throw new Error('expected buy event')
  assert.notStrictEqual(resultBuy, inputBuy)
  assert.notStrictEqual(resultBuy.totalAmount, inputBuy.totalAmount)
  assert.notStrictEqual(result.plans[0], input.plans[0])
})

test('preserves field-level actual, estimated, and unknown confidence', () => {
  const result = createPortfolioEvent(
    event({
      purchaseFee: estimated(99),
      unitNav: unknown(),
      units: actual(10),
    }),
  )

  if (result.kind !== 'buy') throw new Error('expected buy event')
  assert.equal(result.units.confidence, 'actual')
  assert.equal(result.purchaseFee.confidence, 'estimated')
  assert.equal(result.unitNav.confidence, 'unknown')
  assert.equal(result.unitNav.value, null)
})

test('rejects negative values, excessive precision, and invalid calendar or audit dates', () => {
  assert.throws(() => createPortfolioEvent(event({ totalAmount: actual(-1) })), /amount/i)
  assert.throws(() => createPortfolioEvent(event({ units: actual(1.23456) })), /units/i)
  assert.throws(() => createPortfolioEvent(event({ confirmedDate: '2026-02-30' })), /date/i)
  assert.throws(
    () => createPortfolioEvent(event({ auditedAt: '2026-02-30T09:00:00.000Z' })),
    /audit/i,
  )
  assert.throws(() => createPortfolioPlan(plan({ amountCents: 100.5 })), /amount/i)
})

test('rejects duplicate IDs, invalid states, cross-fund references, and kind-incompatible fields', () => {
  assert.throws(
    () =>
      validatePortfolio({
        events: [event(), event()],
        fundCodes: ['000001'],
        installments: [],
        plans: [],
      }),
    /duplicate.*id/i,
  )
  assert.throws(
    () => createPortfolioEvent(event({ settlementStatus: 'settled-error' as never })),
    /status/i,
  )
  assert.throws(
    () =>
      createPortfolio({
        events: [],
        fundCodes: ['000001'],
        installments: [installment({ fundCode: '000002' })],
        plans: [plan()],
      }),
    /fund/i,
  )
  assert.throws(
    () => createPortfolioEvent(event({ cashAmount: actual(1), kind: 'buy' } as never)),
    /kind|field/i,
  )
  assert.throws(
    () => createPortfolioEvent(event({ installmentId: 'installment-1', kind: 'sell' })),
    /kind|association/i,
  )
})

test('requires plan associations to stay on the same fund and keeps input objects unchanged', () => {
  const input = {
    events: [event({ installmentId: 'installment-1', planId: 'plan-1', source: 'plan' })],
    fundCodes: ['000001'],
    installments: [installment()],
    plans: [plan()],
  }
  const before = structuredClone(input)

  assert.deepEqual(createPortfolio(input), input)
  assert.deepEqual(input, before)
  assert.throws(
    () =>
      createPortfolio({
        ...input,
        events: [event({ installmentId: 'installment-1', planId: 'plan-1', source: 'plan' })],
        installments: [installment({ fundCode: '000002' })],
      }),
    /fund/i,
  )
})
