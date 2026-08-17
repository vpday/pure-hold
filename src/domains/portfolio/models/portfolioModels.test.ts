import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPortfolio,
  createPortfolioBatch,
  createPortfolioEvent,
  validatePortfolio,
} from './index.ts'
import type { FieldValue, Portfolio, PortfolioBatch, PortfolioEvent } from './index.ts'

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
      return {
        ...common,
        entryMode: 'pending',
        grossAmount: unknown(),
        kind: 'sell',
        navDate: '2026-08-12',
        netAmount: unknown(),
        redemptionFee: unknown(),
        requestedUnits: actual(1),
        submittedAt: '2026-08-12 12:00',
        unitNav: unknown(),
        units: unknown(),
        ...overrides,
      } as PortfolioEvent
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
        entryMode: 'pending',
        kind: 'buy',
        navDate: '2026-08-12',
        purchaseFee: unknown(),
        purchaseFeeRate: actual(1),
        submittedAt: '2026-08-12 12:00',
        totalAmount: actual(10000),
        unitNav: unknown(),
        units: unknown(),
        ...overrides,
      } as PortfolioEvent
  }
}

test('constructs a portfolio with every event kind and independent batch objects', () => {
  const events: PortfolioEvent[] = [
    event(),
    event({
      confirmedDate: '2026-08-13',
      id: 'event-2',
      kind: 'sell',
      netAmount: actual(11000),
      redemptionFee: actual(100),
      settlementStatus: 'settled',
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
  const resultEvent = createPortfolioEvent(input.events[0])

  assert.deepEqual(result, input)
  assert.deepEqual(resultBatch, batch)
  assert.deepEqual(resultEvent, input.events[0])
  assert.notStrictEqual(result.events, input.events)
  const resultBuy = result.events[0]
  const inputBuy = input.events[0]
  if (resultBuy.kind !== 'buy' || inputBuy.kind !== 'buy') throw new Error('expected buy event')
  assert.notStrictEqual(resultBuy, inputBuy)
  assert.notStrictEqual(resultBuy.totalAmount, inputBuy.totalAmount)
})

test('preserves field-level actual, estimated, and unknown confidence', () => {
  const result = createPortfolioEvent(
    event({
      purchaseFee: estimated(99),
      settlementStatus: 'settled',
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

test('separates pending facts from settlement and does not require fees or NAV to settle', () => {
  const pending = createPortfolioEvent(
    event({ confirmedDate: undefined, units: unknown(), settlementStatus: 'pending-settlement' }),
  )
  assert.equal(pending.kind, 'buy')
  if (pending.kind !== 'buy') return
  assert.equal(pending.confirmedDate, undefined)
  assert.equal(pending.settlementStatus, 'pending-settlement')

  const settled = createPortfolioEvent(
    event({
      confirmedDate: '2026-08-13',
      purchaseFee: unknown(),
      settlementStatus: 'settled',
      unitNav: unknown(),
      units: actual(10),
    }),
  )
  assert.equal(settled.kind, 'buy')
  assert.equal(settled.settlementStatus, 'settled')
})

test('rejects inconsistent transaction modes, dates and statuses', () => {
  assert.throws(
    () =>
      createPortfolioEvent(
        event({ entryMode: 'historical', confirmedDate: undefined, units: unknown() }),
      ),
    /historical.*confirmation/i,
  )
  assert.throws(
    () => createPortfolioEvent(event({ confirmedDate: '2026-08-13', settlementStatus: 'settled' })),
    /settlement/i,
  )
  assert.throws(
    () =>
      createPortfolioEvent(
        event({
          confirmedDate: '2026-08-13',
          expectedConfirmationDate: '2026-08-17',
          settlementStatus: 'pending-settlement',
          units: actual(10),
        }),
      ),
    /expected confirmation/i,
  )
  assert.throws(() => createPortfolioEvent(event({ navDate: '2026-08-13' })), /NAV date/i)
})

test('rejects negative values, excessive precision, and invalid calendar or audit dates', () => {
  assert.throws(() => createPortfolioEvent(event({ totalAmount: actual(-1) })), /amount/i)
  assert.throws(() => createPortfolioEvent(event({ units: actual(1.23456) })), /units/i)
  assert.throws(() => createPortfolioEvent(event({ confirmedDate: '2026-02-30' })), /date/i)
  assert.throws(
    () => createPortfolioEvent(event({ auditedAt: '2026-02-30T09:00:00.000Z' })),
    /audit/i,
  )
})

test('rejects duplicate IDs, invalid states, retired fields, and kind-incompatible fields', () => {
  assert.throws(
    () =>
      validatePortfolio({
        events: [event(), event()],
        fundCodes: ['000001'],
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
        plans: [],
      }),
    /portfolio field plans/i,
  )
  assert.throws(
    () => createPortfolioEvent(event({ cashAmount: actual(1), kind: 'buy' } as never)),
    /kind|field/i,
  )
})

test('rejects retired portfolio collections and keeps input objects unchanged', () => {
  const input = {
    events: [event()],
    fundCodes: ['000001'],
    installments: [],
  }
  const before = structuredClone(input)

  assert.throws(() => createPortfolio(input), /portfolio field installments/i)
  assert.deepEqual(input, before)
})
