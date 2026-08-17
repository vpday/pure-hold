import assert from 'node:assert/strict'
import test from 'node:test'

import type { FieldValue, Portfolio, PortfolioEvent } from '../models/index.ts'
import { createPortfolioStore } from './createPortfolioStore.ts'

const actual = (value: number): FieldValue<number> => ({
  confidence: 'actual',
  source: 'manual',
  value,
})

const unknown = (): FieldValue<number> => ({
  confidence: 'unknown',
  source: 'manual',
  value: null,
})

function buyEvent(overrides: Partial<PortfolioEvent> = {}): PortfolioEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-12',
    createdAt: '2026-08-13T09:00:00.000Z',
    entryMode: 'pending',
    fundCode: '000001',
    id: 'event-1',
    kind: 'buy',
    navDate: '2026-08-12',
    purchaseFee: unknown(),
    purchaseFeeRate: actual(1),
    settlementStatus: 'pending-settlement',
    source: 'manual',
    totalAmount: actual(10000),
    unitNav: unknown(),
    units: unknown(),
    updatedAt: '2026-08-13T09:00:00.000Z',
    submittedAt: '2026-08-12 12:00',
    ...overrides,
  } as PortfolioEvent
}

function emptyPortfolio(): Portfolio {
  return { events: [], fundCodes: [] }
}

test('enables funds and executes idempotent event add, edit, settle, and delete commands', () => {
  const writes: Portfolio[] = []
  const store = createPortfolioStore(emptyPortfolio(), (candidate) => writes.push(candidate))

  assert.equal(store.enableFund('000001').ok, true)
  assert.equal(store.enableFund('000001').ok, true)
  const added = store.addEvent(buyEvent())
  assert.equal(added.ok, true)
  assert.equal(store.addEvent(buyEvent()).ok, true)
  assert.equal(store.addEvent(buyEvent({ totalAmount: actual(20000) })).reason, 'conflict')

  const settled = store.settleEvent(
    buyEvent({
      confirmedDate: '2026-08-14',
      settlementStatus: 'settled',
      units: actual(5),
    }),
  )
  assert.equal(settled.ok, true)
  assert.equal(store.updateEvent(buyEvent({ confirmedDate: '2026-08-14' })).ok, true)
  assert.equal(store.deleteEvent('event-1').ok, true)
  assert.equal(store.deleteEvent('event-1').ok, true)
  assert.deepEqual(store.getPortfolio(), { ...emptyPortfolio(), fundCodes: ['000001'] })
  assert.equal(writes.length, 5)
})

test('disables a fund idempotently and keeps the old state when persistence fails', () => {
  let persisted: Portfolio = { ...emptyPortfolio(), fundCodes: ['000001', '000002'] }
  let failWrites = false
  const store = createPortfolioStore(persisted, (candidate) => {
    if (failWrites) throw new Error('quota exceeded')
    persisted = structuredClone(candidate)
  })

  assert.equal(store.disableFund('000001').ok, true)
  assert.equal(store.disableFund('000001').ok, true)
  assert.deepEqual(store.getPortfolio(), { ...emptyPortfolio(), fundCodes: ['000002'] })
  assert.deepEqual(persisted, store.getPortfolio())

  failWrites = true
  const failed = store.disableFund('000002')
  assert.deepEqual(failed, {
    error: new Error('quota exceeded'),
    ok: false,
    reason: 'persistence-failed',
  })
  assert.deepEqual(store.getPortfolio(), { ...emptyPortfolio(), fundCodes: ['000002'] })
})

test('validates duplicate commands before applying ID idempotence', () => {
  const store = createPortfolioStore(emptyPortfolio(), () => {})

  assert.equal(store.addEvent(buyEvent()).ok, true)
  const result = store.addEvent(buyEvent({ units: actual(1.23456) }))

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'invalid-portfolio')
  assert.deepEqual(store.getPortfolio().events, [buyEvent()])
})

test('keeps old memory and storage when candidate validation or persistence fails', () => {
  let persisted = emptyPortfolio()
  let failWrites = false
  const store = createPortfolioStore(emptyPortfolio(), (candidate) => {
    if (failWrites) throw new Error('quota exceeded')
    persisted = structuredClone(candidate)
  })

  assert.equal(store.addEvent(buyEvent()).ok, true)
  const before = store.getPortfolio()
  failWrites = true
  const result = store.updateEvent(buyEvent({ confirmedDate: '2026-08-14' }))
  assert.deepEqual(result, {
    error: new Error('quota exceeded'),
    ok: false,
    reason: 'persistence-failed',
  })
  assert.deepEqual(store.getPortfolio(), before)
  assert.deepEqual(persisted, before)

  const invalid = store.addEvent(buyEvent({ id: 'event-2', units: actual(1.23456) }))
  assert.equal(invalid.ok, false)
  assert.deepEqual(store.getPortfolio(), before)
})

test('returns detached command results and merges stable IDs without caching calculations', () => {
  const store = createPortfolioStore(emptyPortfolio(), () => {})
  const event = buyEvent({ settlementStatus: 'settled', units: actual(5) })
  const added = store.addEvent(event)
  if (!added.ok) throw new Error('expected event to be added')
  const returnedPortfolio = added.portfolio as unknown as { events: Array<{ id: string }> }
  returnedPortfolio.events[0].id = 'mutated'
  assert.equal(store.getPortfolio().events[0].id, 'event-1')

  const merged = store.mergeCandidate({
    events: [event, buyEvent({ id: 'event-2', confirmedDate: '2026-08-14' })],
    fundCodes: ['000002'],
  })
  assert.equal(merged.ok, true)
  assert.deepEqual(store.getPortfolio().fundCodes, ['000002'])
  assert.equal(store.getPortfolio().events.length, 2)

  const calculation = store.calculate({ asOfDate: '2026-08-14', currentNavByFund: {} })
  assert.equal(calculation.events.length, 2)
  assert.equal('batches' in store.getPortfolio(), false)
})

test('rejects merge conflicts and does not create new IDs', () => {
  const store = createPortfolioStore(emptyPortfolio(), () => {})
  assert.equal(store.addEvent(buyEvent()).ok, true)
  const result = store.mergeCandidate({
    events: [buyEvent({ totalAmount: actual(20000) })],
    fundCodes: [],
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'conflict')
  assert.deepEqual(
    store.getPortfolio().events.map(({ id }) => id),
    ['event-1'],
  )
})
