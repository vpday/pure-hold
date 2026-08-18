import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  FieldValue,
  PortfolioAdjustmentEvent,
  PortfolioBuyEvent,
  PortfolioCashDividendEvent,
  PortfolioDividendReinvestmentEvent,
  PortfolioEvent,
  PortfolioInitialHoldingEvent,
  PortfolioSellEvent,
} from '../models/index.ts'
import { calculatePortfolio } from './calculatePortfolio.ts'

const field = (
  value: number | null,
  confidence: FieldValue<number>['confidence'],
  source: FieldValue<number>['source'],
): FieldValue<number> => ({ confidence, source, value })

const actual = (value: number, source: FieldValue<number>['source'] = 'manual') =>
  field(value, 'actual', source)
const estimated = (value: number, source: FieldValue<number>['source'] = 'formula') =>
  field(value, 'estimated', source)
const unknown = (source: FieldValue<number>['source'] = 'formula') => field(null, 'unknown', source)

function buyEvent(overrides: Partial<PortfolioBuyEvent> = {}): PortfolioBuyEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-10',
    createdAt: '2026-08-13T09:00:00.000Z',
    entryMode: 'historical',
    fundCode: '000001',
    id: 'buy-1',
    kind: 'buy',
    navDate: '2026-08-10',
    purchaseFee: actual(0),
    purchaseFeeRate: actual(0, 'fund-basic-info'),
    settlementStatus: 'settled',
    source: 'manual',
    submittedAt: '2026-08-09 12:00',
    totalAmount: actual(10000),
    unitNav: actual(1),
    units: actual(10),
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

function initialHoldingEvent(
  overrides: Partial<PortfolioInitialHoldingEvent> = {},
): PortfolioInitialHoldingEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-09',
    costAmount: actual(10000, 'migration'),
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'initial-1',
    kind: 'initial-holding',
    settlementStatus: 'settled',
    source: 'initial-holding',
    units: actual(10, 'migration'),
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

function sellEvent(overrides: Partial<PortfolioSellEvent> = {}): PortfolioSellEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-12',
    createdAt: '2026-08-13T09:00:00.000Z',
    entryMode: 'historical',
    fundCode: '000001',
    grossAmount: actual(5000),
    id: 'sell-1',
    kind: 'sell',
    navDate: '2026-08-12',
    netAmount: actual(4900),
    redemptionFee: actual(100),
    requestedUnits: actual(5),
    settlementStatus: 'settled',
    source: 'manual',
    submittedAt: '2026-08-12 12:00',
    unitNav: actual(1),
    units: actual(5),
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

function cashDividendEvent(
  overrides: Partial<PortfolioCashDividendEvent> = {},
): PortfolioCashDividendEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    cashAmount: actual(1234, 'platform'),
    confirmedDate: '2026-08-11',
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'cash-1',
    kind: 'cash-dividend',
    settlementStatus: 'settled',
    source: 'manual',
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

function dividendReinvestmentEvent(
  overrides: Partial<PortfolioDividendReinvestmentEvent> = {},
): PortfolioDividendReinvestmentEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-11',
    createdAt: '2026-08-13T09:00:00.000Z',
    dividendAmount: actual(300, 'platform'),
    fundCode: '000001',
    id: 'reinvest-1',
    kind: 'dividend-reinvestment',
    settlementStatus: 'settled',
    source: 'dividend-reinvestment',
    unitNav: actual(1.5, 'platform'),
    units: actual(2, 'platform'),
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

function adjustmentEvent(
  overrides: Partial<PortfolioAdjustmentEvent> = {},
): PortfolioAdjustmentEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-11',
    targetCostAmount: actual(10200, 'platform'),
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'adjustment-1',
    kind: 'adjustment',
    reason: '平台对账修正',
    settlementStatus: 'settled',
    source: 'adjustment',
    targetUnits: actual(12, 'platform'),
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

function calculate(events: readonly PortfolioEvent[]) {
  return calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events,
  })
}

function aggregate(result: ReturnType<typeof calculate>, fundCode = '000001') {
  const value = result.aggregates.find((item) => item.fundCode === fundCode)
  assert.ok(value, `missing aggregate for ${fundCode}`)
  return value
}

test('exposes one aggregate per fund and no FIFO batch or allocation outputs', () => {
  const result = calculate([buyEvent()])

  assert.equal('batches' in result, false)
  assert.equal('sellAllocations' in result, false)
  assert.deepEqual(result.aggregates, [
    {
      costAmount: field(10000, 'actual', 'formula'),
      fundCode: '000001',
      units: actual(10),
    },
  ])
})

test('starts an aggregate from initial holding', () => {
  const result = calculate([initialHoldingEvent()])

  assert.deepEqual(aggregate(result), {
    costAmount: actual(10000, 'migration'),
    fundCode: '000001',
    units: actual(10, 'migration'),
  })
})

test('adds buy amount and purchase fee to the weighted average cost', () => {
  const result = calculate([
    buyEvent({ id: 'buy-one', totalAmount: actual(10000), units: actual(100) }),
    buyEvent({
      confirmedDate: '2026-08-11',
      id: 'buy-two',
      purchaseFee: actual(200),
      totalAmount: actual(20000),
      units: actual(100),
    }),
  ])

  assert.equal(aggregate(result).units.value, 200)
  assert.equal(aggregate(result).costAmount.value, 30200)
  assert.equal(aggregate(result).costAmount.confidence, 'actual')
})

test('sells at the pre-sell average cost and keeps redemption fees out of cost basis', () => {
  const result = calculate([
    buyEvent({ purchaseFee: actual(100), totalAmount: actual(10000), units: actual(100) }),
    sellEvent({ netAmount: actual(5000), redemptionFee: actual(100), units: actual(40) }),
  ])

  assert.equal(result.sellEvents[0]?.costBasisAmount.value, 4040)
  assert.equal(result.sellEvents[0]?.realizedGain.value, 960)
  assert.equal(aggregate(result).units.value, 60)
  assert.equal(aggregate(result).costAmount.value, 6060)
})

test('recomputes the average after partial sell and later buy', () => {
  const result = calculate([
    buyEvent({ id: 'buy-one', units: actual(100), totalAmount: actual(10000) }),
    buyEvent({
      confirmedDate: '2026-08-11',
      id: 'buy-two',
      purchaseFee: actual(200),
      totalAmount: actual(20000),
      units: actual(100),
    }),
    sellEvent({ id: 'sell-one', units: actual(50), requestedUnits: actual(50) }),
    buyEvent({
      confirmedDate: '2026-08-13',
      id: 'buy-three',
      totalAmount: actual(5000),
      units: actual(50),
    }),
  ])

  assert.equal(result.sellEvents[0]?.costBasisAmount.value, 7550)
  assert.equal(aggregate(result).units.value, 200)
  assert.equal(aggregate(result).costAmount.value, 27650)
})

test('clears units and cost on a full sell while retaining the aggregate fund', () => {
  const result = calculate([
    buyEvent({ units: actual(10), totalAmount: actual(10000) }),
    sellEvent({ units: actual(10), requestedUnits: actual(10) }),
  ])

  assert.deepEqual(aggregate(result), {
    costAmount: field(0, 'actual', 'formula'),
    fundCode: '000001',
    units: field(0, 'actual', 'formula'),
  })
})

test('does not apply a sell that exceeds available units', () => {
  const result = calculate([
    buyEvent({ units: actual(10), totalAmount: actual(10000) }),
    sellEvent({ units: actual(11), requestedUnits: actual(11) }),
  ])

  assert.deepEqual(result.issues, [
    {
      availableUnits: estimated(10),
      code: 'insufficient-units',
      eventId: 'sell-1',
      fundCode: '000001',
      requestedUnits: actual(11),
    },
  ])
  assert.equal(result.sellEvents[0]?.costBasisAmount.value, null)
  assert.equal(aggregate(result).units.value, 10)
  assert.equal(aggregate(result).costAmount.value, 10000)
})

test('replays same-day events in stable ID order', () => {
  const buy = buyEvent({ confirmedDate: '2026-08-12', id: 'buy-same-day' })
  const sell = sellEvent({
    confirmedDate: '2026-08-12',
    id: 'sell-same-day',
    units: actual(5),
    requestedUnits: actual(5),
  })

  const first = calculate([sell, buy])
  const second = calculate([buy, sell])
  assert.equal(first.issues.length, 0)
  assert.equal(second.issues.length, 0)
  assert.equal(aggregate(first).units.value, 5)
  assert.equal(aggregate(second).units.value, 5)
})

test('applies target adjustments directly to the aggregate', () => {
  const result = calculate([
    initialHoldingEvent(),
    adjustmentEvent({ id: 'add', targetCostAmount: actual(10200), targetUnits: actual(12) }),
    adjustmentEvent({
      confirmedDate: '2026-08-12',
      targetCostAmount: actual(10100),
      id: 'remove',
      targetUnits: actual(11),
    }),
  ])

  assert.equal(aggregate(result).units.value, 11)
  assert.equal(aggregate(result).costAmount.value, 10100)
  assert.equal(
    result.adjustmentEvents.every((event) => event.settlementStatus === 'settled'),
    true,
  )
})

test('reports invalid target adjustments without changing the aggregate', () => {
  const result = calculate([
    initialHoldingEvent(),
    adjustmentEvent({
      targetCostAmount: actual(-1000),
      id: 'invalid-adjustment',
      targetUnits: actual(-1),
    }),
  ])

  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['invalid-adjustment-target'],
  )
  assert.equal(result.adjustmentEvents[0]?.settlementStatus, 'pending-settlement')
  assert.equal(aggregate(result).units.value, 10)
  assert.equal(aggregate(result).costAmount.value, 10000)
})

test('puts incomplete or estimated target adjustments in pending settlement', () => {
  const result = calculate([
    initialHoldingEvent(),
    adjustmentEvent({
      id: 'pending-adjustment',
      targetCostAmount: unknown(),
      targetUnits: estimated(12),
    }),
  ])

  assert.equal(result.adjustmentEvents[0]?.settlementStatus, 'pending-settlement')
  assert.deepEqual(result.pendingSettlement, [
    {
      eventId: 'pending-adjustment',
      fundCode: '000001',
      missingFacts: ['adjustment-target-units', 'adjustment-target-cost-amount'],
    },
  ])
  assert.equal(aggregate(result).units.value, 10)
  assert.equal(aggregate(result).costAmount.value, 10000)
})

test('always replays an initial holding before later events for the same fund', () => {
  const result = calculate([
    buyEvent({ confirmedDate: '2026-08-01', id: 'buy-before-initial', units: actual(5) }),
    initialHoldingEvent({ confirmedDate: '2026-08-12', id: 'initial-holding:000001' }),
    sellEvent({ confirmedDate: '2026-08-13', id: 'sell-after-initial', units: actual(3) }),
  ])

  assert.equal(result.issues.length, 0)
  assert.equal(aggregate(result).units.value, 12)
  assert.equal(aggregate(result).costAmount.value, 16000)
})

test('counts cash dividends without changing aggregate cost or units', () => {
  const result = calculate([initialHoldingEvent(), cashDividendEvent()])

  assert.equal(aggregate(result).units.value, 10)
  assert.equal(aggregate(result).costAmount.value, 10000)
  assert.equal(result.confirmedSummary.byFund['000001']?.cashDividend.value, 1234)
  assert.equal(result.confirmedSummary.byFund['000001']?.cashInvested.value, 0)
})

test('adds dividend reinvestment units and amount to the aggregate', () => {
  const result = calculate([initialHoldingEvent(), dividendReinvestmentEvent()])

  assert.equal(aggregate(result).units.value, 12)
  assert.equal(aggregate(result).costAmount.value, 10300)
  assert.equal(result.confirmedSummary.byFund['000001']?.cashInvested.value, 0)
})

test('does not put pending or cost-incomplete buys in the confirmed aggregate', () => {
  const pending = buyEvent({
    confirmedDate: undefined,
    id: 'pending-buy',
    settlementStatus: 'pending-settlement',
    units: unknown(),
  })
  const missingFee = buyEvent({
    id: 'missing-fee',
    purchaseFee: unknown(),
    purchaseFeeRate: unknown('fund-basic-info'),
  })
  const result = calculate([pending, missingFee])

  assert.equal(result.aggregates.length, 0)
  assert.equal(result.confirmedSummary.byFund['000001'], undefined)
  assert.equal(
    result.pendingSettlement.some((item) => item.eventId === 'pending-buy'),
    true,
  )
  assert.equal(result.estimatedSummary.byFund['000001']?.cashInvested.value, 10000)
})

test('keeps estimated costs in estimated summary but out of confirmed summary', () => {
  const result = calculate([
    buyEvent({
      purchaseFee: unknown(),
      purchaseFeeRate: actual(1, 'fund-basic-info'),
    }),
  ])

  assert.equal(aggregate(result).costAmount.confidence, 'estimated')
  assert.equal(result.confirmedSummary.byFund['000001'], undefined)
  assert.equal(result.estimatedSummary.byFund['000001']?.units.value, 10)
  assert.equal(result.estimatedSummary.byFund['000001']?.costAmount.confidence, 'estimated')
})

test('uses the revised event history when an earlier event is edited or deleted', () => {
  const first = buyEvent({ id: 'first', units: actual(10), totalAmount: actual(10000) })
  const second = buyEvent({
    confirmedDate: '2026-08-11',
    id: 'second',
    totalAmount: actual(20000),
    units: actual(10),
  })
  const original = calculate([first, second])
  const edited = calculate([{ ...first, totalAmount: actual(30000) }, second])
  const deleted = calculate([second])

  assert.equal(aggregate(original).costAmount.value, 30000)
  assert.equal(aggregate(edited).costAmount.value, 50000)
  assert.equal(aggregate(deleted).costAmount.value, 20000)
})

test('does not mutate events and produces stable repeated calculations', () => {
  const events: readonly PortfolioEvent[] = [
    initialHoldingEvent(),
    sellEvent({ units: actual(3), requestedUnits: actual(3) }),
    cashDividendEvent(),
  ]
  const snapshot = structuredClone(events)
  const first = calculate(events)
  const second = calculate(events)

  assert.deepEqual(events, snapshot)
  assert.deepEqual(first, second)
})

test('rounds partial sell cost in cents and clears the final remainder', () => {
  const result = calculate([
    initialHoldingEvent({ costAmount: actual(10001), units: actual(3) }),
    sellEvent({ id: 'sell-one', units: actual(1), requestedUnits: actual(1) }),
    sellEvent({
      confirmedDate: '2026-08-13',
      id: 'sell-two',
      units: actual(2),
      requestedUnits: actual(2),
    }),
  ])

  assert.equal(result.sellEvents[0]?.costBasisAmount.value, 3334)
  assert.equal(result.sellEvents[1]?.costBasisAmount.value, 6667)
  assert.equal(aggregate(result).units.value, 0)
  assert.equal(aggregate(result).costAmount.value, 0)
})
