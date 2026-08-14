import assert from 'node:assert/strict'
import test from 'node:test'

import { calculatePortfolio } from './calculatePortfolio.ts'
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

const field = (
  value: number | null,
  confidence: FieldValue<number>['confidence'],
  source: FieldValue<number>['source'],
): FieldValue<number> => ({ confidence, source, value })

const actual = (value: number, source: FieldValue<number>['source'] = 'manual') =>
  field(value, 'actual', source)

function buyEvent(overrides: Partial<PortfolioBuyEvent> = {}): PortfolioBuyEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-12',
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'event-1',
    kind: 'buy',
    purchaseFee: field(null, 'unknown', 'formula'),
    purchaseFeeRate: actual(1, 'fund-basic-info'),
    settlementStatus: 'pending-settlement',
    source: 'manual',
    totalAmount: actual(10000),
    unitNav: field(null, 'unknown', 'nav-history'),
    units: field(null, 'unknown', 'formula'),
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

function sellEvent(overrides: Partial<PortfolioSellEvent> = {}): PortfolioSellEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-13',
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'sell-1',
    kind: 'sell',
    settlementStatus: 'settled',
    source: 'manual',
    units: actual(120),
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
    costAmount: actual(100000, 'migration'),
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'initial-1',
    kind: 'initial-holding',
    settlementStatus: 'settled',
    source: 'initial-holding',
    units: actual(100, 'migration'),
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
    confirmedDate: '2026-08-12',
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'cash-dividend-1',
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
    id: 'dividend-reinvestment-1',
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
    confirmedDate: '2026-08-12',
    costAmountDelta: actual(200, 'platform'),
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'adjustment-1',
    kind: 'adjustment',
    reason: '平台对账修正',
    settlementStatus: 'settled',
    source: 'adjustment',
    unitsDelta: actual(2, 'platform'),
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}

test('records settled cash dividends as cash income without adding holdings or cash invested', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [cashDividendEvent()],
  })

  assert.deepEqual(result.cashDividendEvents, [
    {
      cashAmount: actual(1234, 'platform'),
      eventId: 'cash-dividend-1',
      fundCode: '000001',
      settlementStatus: 'settled',
    },
  ])
  assert.deepEqual(result.batches, [])
  assert.equal(result.confirmedSummary.byFund['000001'].cashDividend.value, 1234)
  assert.equal(result.confirmedSummary.byFund['000001'].cashInvested.value, 0)
  assert.equal(result.confirmedSummary.byFund['000001'].units.value, null)
})

test('creates a FIFO batch from actual dividend reinvestment without increasing cash invested', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        confirmedDate: '2026-08-10',
        id: 'buy-before-dividend',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      dividendReinvestmentEvent(),
      sellEvent({
        id: 'sell-after-dividend',
        units: actual(11),
        netAmount: actual(11000, 'platform'),
      }),
    ],
  })

  assert.deepEqual(result.dividendReinvestmentEvents, [
    {
      dividendAmount: actual(300, 'platform'),
      eventId: 'dividend-reinvestment-1',
      fundCode: '000001',
      settlementStatus: 'settled',
      unitNav: actual(1.5, 'platform'),
      units: actual(2, 'platform'),
    },
  ])
  assert.deepEqual(result.sellAllocations, [
    {
      buyEventId: 'buy-before-dividend',
      sellEventId: 'sell-after-dividend',
      units: field(10, 'actual', 'formula'),
      costAmount: field(10000, 'actual', 'manual'),
    },
    {
      buyEventId: 'dividend-reinvestment-1',
      sellEventId: 'sell-after-dividend',
      units: field(1, 'actual', 'formula'),
      costAmount: field(150, 'estimated', 'formula'),
    },
  ])
  assert.deepEqual(result.batches, [
    {
      eventId: 'dividend-reinvestment-1',
      fundCode: '000001',
      confirmedDate: '2026-08-11',
      units: actual(1, 'platform'),
      costAmount: actual(150, 'platform'),
    },
  ])
  assert.equal(result.estimatedSummary.byFund['000001'].cashInvested.value, 10000)
})

test('orders a dividend reinvestment by confirmation date before FIFO consumption', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        confirmedDate: '2026-08-10',
        id: 'buy-after-reinvestment',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      sellEvent({
        confirmedDate: '2026-08-12',
        id: 'sell-after-reinvestment',
        netAmount: actual(1000, 'platform'),
        units: actual(1),
      }),
      dividendReinvestmentEvent({ confirmedDate: '2026-08-09' }),
    ],
  })

  assert.equal(result.sellAllocations[0].buyEventId, 'dividend-reinvestment-1')
  assert.equal(result.batches[0].eventId, 'dividend-reinvestment-1')
  assert.equal(result.batches[0].units.value, 1)
})

test('applies positive and negative adjustments without cash or realized gain', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        confirmedDate: '2026-08-10',
        id: 'buy-before-adjustment',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      adjustmentEvent(),
      adjustmentEvent({
        costAmountDelta: actual(-100, 'platform'),
        id: 'adjustment-2',
        unitsDelta: actual(-1, 'platform'),
      }),
    ],
  })

  assert.deepEqual(result.adjustmentEvents, [
    {
      costAmountDelta: actual(200, 'platform'),
      eventId: 'adjustment-1',
      fundCode: '000001',
      reason: '平台对账修正',
      settlementStatus: 'settled',
      unitsDelta: actual(2, 'platform'),
    },
    {
      costAmountDelta: actual(-100, 'platform'),
      eventId: 'adjustment-2',
      fundCode: '000001',
      reason: '平台对账修正',
      settlementStatus: 'settled',
      unitsDelta: actual(-1, 'platform'),
    },
  ])
  assert.equal(result.confirmedSummary.byFund['000001'].units.value, 11)
  assert.equal(result.confirmedSummary.byFund['000001'].costAmount.value, 10100)
  assert.equal(result.confirmedSummary.byFund['000001'].cashInvested.value, 10000)
  assert.equal(result.confirmedSummary.byFund['000001'].realizedGain.value, 0)
  assert.deepEqual(result.sellAllocations, [])
  assert.deepEqual(result.sellEvents, [])
})

test('applies a cost-only adjustment to the latest settled batch', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'buy-before-cost-adjustment',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      adjustmentEvent({
        costAmountDelta: actual(500, 'platform'),
        id: 'cost-only-adjustment',
        unitsDelta: actual(0, 'platform'),
      }),
    ],
  })

  assert.equal(result.confirmedSummary.byFund['000001'].units.value, 10)
  assert.equal(result.confirmedSummary.byFund['000001'].costAmount.value, 10500)
  assert.equal(result.confirmedSummary.byFund['000001'].cashInvested.value, 10000)
  assert.equal(result.confirmedSummary.byFund['000001'].realizedGain.value, 0)
})

test('keeps an overdrawn negative adjustment pending without changing FIFO batches', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'buy-before-overdrawn-adjustment',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      adjustmentEvent({
        costAmountDelta: actual(-100, 'platform'),
        id: 'overdrawn-adjustment',
        unitsDelta: actual(-11, 'platform'),
      }),
    ],
  })

  assert.deepEqual(result.issues, [
    {
      availableUnits: field(10, 'estimated', 'formula'),
      code: 'insufficient-adjustment-units',
      eventId: 'overdrawn-adjustment',
      fundCode: '000001',
      requestedUnits: actual(-11, 'platform'),
    },
  ])
  assert.equal(result.adjustmentEvents[0].settlementStatus, 'pending-settlement')
  assert.equal(result.batches[0].units.value, 10)
  assert.equal(result.batches[0].costAmount.value, 10000)
  assert.deepEqual(
    result.pendingSettlement.map(({ eventId }) => eventId),
    ['overdrawn-adjustment'],
  )
})

test('keeps estimated dividends separate and exposes missing facts for pending events', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      cashDividendEvent({
        cashAmount: field(null, 'unknown', 'manual'),
        id: 'pending-cash-dividend',
      }),
      cashDividendEvent({
        cashAmount: field(500, 'estimated', 'formula'),
        id: 'estimated-cash-dividend',
      }),
      dividendReinvestmentEvent({
        dividendAmount: field(null, 'unknown', 'platform'),
        id: 'pending-reinvestment',
        units: field(null, 'unknown', 'platform'),
      }),
      adjustmentEvent({
        costAmountDelta: field(null, 'unknown', 'platform'),
        id: 'pending-adjustment',
        unitsDelta: field(null, 'unknown', 'platform'),
      }),
    ],
  })

  assert.equal(result.cashDividendEvents[0].settlementStatus, 'pending-settlement')
  assert.equal(result.cashDividendEvents[1].settlementStatus, 'settled')
  assert.equal(result.dividendReinvestmentEvents[0].settlementStatus, 'pending-settlement')
  assert.equal(result.adjustmentEvents[0].settlementStatus, 'pending-settlement')
  assert.equal(result.confirmedSummary.byFund['000001'], undefined)
  assert.equal(result.estimatedSummary.byFund['000001'].cashDividend.value, 500)
  assert.deepEqual(
    result.pendingSettlement.map(({ eventId, missingFacts }) => ({ eventId, missingFacts })),
    [
      { eventId: 'pending-cash-dividend', missingFacts: ['cash-amount'] },
      {
        eventId: 'pending-reinvestment',
        missingFacts: ['dividend-amount', 'reinvestment-units'],
      },
      {
        eventId: 'pending-adjustment',
        missingFacts: ['adjustment-units', 'adjustment-cost-amount'],
      },
    ],
  )
  assert.equal(
    result.batches.some(({ eventId }) => eventId === 'pending-reinvestment'),
    false,
  )
})

test('keeps estimated reinvestment in estimated holdings without changing confirmed units', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'confirmed-buy-before-estimated-reinvestment',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      dividendReinvestmentEvent({
        dividendAmount: field(300, 'estimated', 'formula'),
        id: 'estimated-reinvestment',
        units: field(2, 'estimated', 'formula'),
      }),
    ],
  })

  assert.equal(result.confirmedSummary.byFund['000001'].units.value, 10)
  assert.equal(result.estimatedSummary.byFund['000001'].units.value, 12)
  assert.equal(result.estimatedSummary.byFund['000001'].units.confidence, 'estimated')
  assert.equal(result.estimatedSummary.byFund['000001'].cashInvested.value, 10000)
})

test('rebuilds dividend and adjustment summaries after edits or deletions without mutating facts', () => {
  const events: PortfolioEvent[] = [
    buyEvent({
      id: 'buy-before-recalculation',
      settlementStatus: 'settled',
      totalAmount: actual(10000),
      units: actual(10),
    }),
    cashDividendEvent({ cashAmount: actual(100, 'platform'), id: 'cash-before-recalculation' }),
    dividendReinvestmentEvent({ id: 'reinvestment-before-recalculation' }),
    adjustmentEvent({ id: 'adjustment-before-recalculation' }),
  ]
  const inputBefore = structuredClone(events)

  const original = calculatePortfolio({ asOfDate: '2026-08-13', currentNavByFund: {}, events })
  const edited = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: events.map((event) =>
      event.id === 'cash-before-recalculation'
        ? { ...event, cashAmount: actual(200, 'platform') }
        : event,
    ),
  })
  const deleted = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: events.filter((event) => event.id !== 'reinvestment-before-recalculation'),
  })

  assert.equal(original.estimatedSummary.byFund['000001'].cashDividend.value, 100)
  assert.equal(edited.estimatedSummary.byFund['000001'].cashDividend.value, 200)
  assert.equal(original.estimatedSummary.byFund['000001'].units.value, 14)
  assert.equal(deleted.estimatedSummary.byFund['000001'].units.value, 12)
  assert.deepEqual(
    original,
    calculatePortfolio({ asOfDate: '2026-08-13', currentNavByFund: {}, events }),
  )
  assert.deepEqual(events, inputBefore)
})

test('keeps explicitly pending dividend and adjustment facts out of both summaries', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      cashDividendEvent({ id: 'pending-cash', settlementStatus: 'pending-settlement' }),
      dividendReinvestmentEvent({
        id: 'pending-reinvestment-complete',
        settlementStatus: 'pending-settlement',
      }),
      adjustmentEvent({
        id: 'pending-adjustment-complete',
        settlementStatus: 'pending-settlement',
      }),
    ],
  })

  assert.equal(result.cashDividendEvents[0].settlementStatus, 'pending-settlement')
  assert.equal(result.dividendReinvestmentEvents[0].settlementStatus, 'pending-settlement')
  assert.equal(result.adjustmentEvents[0].settlementStatus, 'pending-settlement')
  assert.equal(result.confirmedSummary.byFund['000001'], undefined)
  assert.equal(result.estimatedSummary.byFund['000001'], undefined)
  assert.deepEqual(
    result.pendingSettlement.map(({ eventId }) => eventId),
    ['pending-cash', 'pending-reinvestment-complete', 'pending-adjustment-complete'],
  )
  assert.deepEqual(result.pendingSettlement[0].missingFacts, [])
})

test('keeps complete explicitly pending buys out of both summaries and batches', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'pending-buy-complete',
        purchaseFee: actual(100, 'platform'),
        settlementStatus: 'pending-settlement',
        unitNav: actual(1.5, 'platform'),
        units: actual(66, 'platform'),
      }),
    ],
  })

  assert.equal(result.events[0].settlementStatus, 'pending-settlement')
  assert.equal(result.confirmedSummary.byFund['000001'], undefined)
  assert.equal(result.estimatedSummary.byFund['000001'], undefined)
  assert.deepEqual(result.batches, [])
  assert.deepEqual(result.pendingSettlement, [
    {
      eventId: 'pending-buy-complete',
      fundCode: '000001',
      missingFacts: [],
      totalAmount: actual(10000),
    },
  ])
})

test('keeps complete explicitly pending sells out of FIFO and summaries', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'buy-before-pending-sell',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      sellEvent({
        id: 'pending-sell-complete',
        netAmount: actual(2000, 'platform'),
        settlementStatus: 'pending-settlement',
        unitNav: actual(2, 'platform'),
        units: actual(10),
      }),
    ],
  })

  assert.equal(result.sellEvents[0].settlementStatus, 'pending-settlement')
  assert.deepEqual(result.sellAllocations, [])
  assert.deepEqual(result.batches, [
    {
      eventId: 'buy-before-pending-sell',
      fundCode: '000001',
      confirmedDate: '2026-08-12',
      units: actual(10),
      costAmount: actual(10000),
    },
  ])
  assert.equal(result.confirmedSummary.byFund['000001'].units.value, 10)
  assert.equal(result.confirmedSummary.byFund['000001'].costAmount.value, 10000)
  assert.equal(result.estimatedSummary.byFund['000001'].units.value, 10)
  assert.equal(result.estimatedSummary.byFund['000001'].costAmount.value, 10000)
  assert.deepEqual(result.pendingSettlement, [
    {
      eventId: 'pending-sell-complete',
      fundCode: '000001',
      missingFacts: [],
    },
  ])
})

test('reports zero current holdings after confirmed batches are fully sold', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-13', unitNav: actual(2, 'nav-history') },
    },
    events: [
      initialHoldingEvent({
        costAmount: actual(5000, 'migration'),
        id: 'initial-before-full-sell',
        units: actual(5, 'migration'),
      }),
      buyEvent({
        confirmedDate: '2026-08-10',
        id: 'buy-before-full-sell',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      dividendReinvestmentEvent({
        confirmedDate: '2026-08-11',
        id: 'reinvestment-before-full-sell',
        dividendAmount: actual(300, 'platform'),
        units: actual(2, 'platform'),
      }),
      sellEvent({
        id: 'sell-all-confirmed-batches',
        netAmount: actual(17000, 'platform'),
        settlementStatus: 'settled',
        units: actual(17),
      }),
    ],
  })

  for (const summary of [
    result.confirmedSummary.byFund['000001'],
    result.estimatedSummary.byFund['000001'],
  ]) {
    assert.equal(summary.units.value, 0)
    assert.equal(summary.costAmount.value, 0)
    assert.equal(summary.marketValue.value, 0)
    assert.equal(summary.unrealizedGain.value, 0)
  }
  assert.deepEqual(result.batches, [])
})

test('derives current value and income totals from settled facts and FIFO results', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-13', unitNav: actual(2, 'nav-history') },
    },
    events: [
      buyEvent({
        id: 'buy-for-summary',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      cashDividendEvent({ cashAmount: actual(500, 'platform'), id: 'cash-for-summary' }),
      sellEvent({
        id: 'sell-for-summary',
        netAmount: actual(5000, 'platform'),
        settlementStatus: 'settled',
        units: actual(4),
      }),
    ],
  })

  const summary = result.estimatedSummary.byFund['000001']
  assert.equal(summary.units.value, 6)
  assert.equal(summary.marketValue.value, 1200)
  assert.equal(summary.costAmount.value, 6000)
  assert.equal(summary.cashInvested.value, 10000)
  assert.equal(summary.cashDividend.value, 500)
  assert.equal(summary.sellProceeds.value, 5000)
  assert.equal(summary.realizedGain.value, 1000)
  assert.equal(summary.unrealizedGain.value, -4800)
  assert.equal(summary.totalGain.value, -3300)
})

test('keeps incomplete redemption facts visible without inventing realized or total gain', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-13', unitNav: actual(2, 'nav-history') },
    },
    events: [
      buyEvent({
        id: 'buy-before-incomplete-redemption',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      sellEvent({
        id: 'incomplete-redemption',
        settlementStatus: 'settled',
        unitNav: actual(2, 'platform'),
        units: actual(4),
      }),
    ],
  })

  const summary = result.estimatedSummary.byFund['000001']
  assert.equal(summary.sellProceeds.value, null)
  assert.equal(summary.realizedGain.value, null)
  assert.equal(summary.realizedGain.confidence, 'unknown')
  assert.equal(summary.unrealizedGain.value, -4800)
  assert.equal(summary.totalGain.value, null)
})

test('calculates a settled buy from gross cents, fee percent, and an exact-date NAV', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-12', unitNav: actual(2, 'nav-history') },
    },
    events: [buyEvent({ settlementStatus: 'settled' })],
  })

  assert.equal(result.events[0].settlementStatus, 'settled')
  assert.deepEqual(result.events[0].netPurchaseAmount, {
    confidence: 'estimated',
    source: 'formula',
    value: 9901,
  })
  assert.deepEqual(result.events[0].purchaseFee, {
    confidence: 'estimated',
    source: 'formula',
    value: 99,
  })
  assert.deepEqual(result.events[0].units, {
    confidence: 'estimated',
    source: 'formula',
    value: 49.505,
  })
  assert.equal(result.confirmedSummary.byFund['000001'], undefined)
  assert.deepEqual(result.estimatedSummary.byFund['000001'].units, {
    confidence: 'estimated',
    source: 'formula',
    value: 49.505,
  })
  assert.deepEqual(result.pendingSettlement, [])
})

test('calculates zero-fee buys without changing the gross amount', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-12', unitNav: actual(2, 'nav-history') },
    },
    events: [
      buyEvent({ purchaseFeeRate: actual(0, 'fund-basic-info'), totalAmount: actual(12345) }),
    ],
  })

  assert.deepEqual(result.events[0].netPurchaseAmount, {
    confidence: 'estimated',
    source: 'formula',
    value: 12345,
  })
  assert.deepEqual(result.events[0].purchaseFee, {
    confidence: 'estimated',
    source: 'formula',
    value: 0,
  })
  assert.deepEqual(result.events[0].units, {
    confidence: 'estimated',
    source: 'formula',
    value: 61.725,
  })
})

test('keeps buys pending when the fee rate or exact same-day NAV is unavailable', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-12', unitNav: actual(2, 'nav-history') },
      '000002': { date: '2026-08-12', unitNav: actual(0, 'nav-history') },
      '000003': { date: '2026-08-13', unitNav: actual(2, 'nav-history') },
      '000004': { date: '2026-08-11', unitNav: actual(2, 'nav-history') },
    },
    events: [
      buyEvent({
        id: 'missing-rate',
        purchaseFeeRate: field(null, 'unknown', 'fund-basic-info'),
      }),
      buyEvent({
        fundCode: '000002',
        id: 'invalid-nav',
        purchaseFeeRate: actual(1, 'fund-basic-info'),
      }),
      buyEvent({
        fundCode: '000003',
        id: 'future-nav',
        purchaseFeeRate: actual(1, 'fund-basic-info'),
      }),
      buyEvent({
        fundCode: '000004',
        id: 'previous-nav',
        purchaseFeeRate: actual(1, 'fund-basic-info'),
      }),
    ],
  })

  assert.equal(
    result.events.every((event) => event.settlementStatus === 'pending-settlement'),
    true,
  )
  assert.equal(result.events[0].purchaseFee.value, null)
  assert.equal(result.events[0].units.value, null)
  assert.equal(result.events[0].unitNav.value, 2)
  assert.equal(result.events[1].unitNav.value, null)
  assert.equal(result.events[2].unitNav.value, null)
  assert.equal(result.events[3].unitNav.value, null)
  assert.equal(result.confirmedSummary.byFund['000001'], undefined)
  assert.equal(result.estimatedSummary.byFund['000001'], undefined)
  assert.equal(result.pendingSettlement.length, 4)
  assert.deepEqual(result.pendingSettlement[0].missingFacts, ['purchase-fee-rate', 'units'])
})

test('does not replace an invalid actual event NAV with another NAV input', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-12', unitNav: actual(2, 'nav-history') },
    },
    events: [buyEvent({ unitNav: actual(0, 'platform') })],
  })

  assert.equal(result.events[0].unitNav.value, null)
  assert.equal(result.events[0].unitNav.source, 'platform')
  assert.equal(result.events[0].settlementStatus, 'pending-settlement')
})

test('settles from actual units without inventing a fee rate or NAV', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        purchaseFeeRate: field(null, 'unknown', 'fund-basic-info'),
        settlementStatus: 'settled',
        units: actual(49.5),
      }),
    ],
  })

  assert.equal(result.events[0].settlementStatus, 'settled')
  assert.deepEqual(result.events[0].purchaseFee, field(null, 'unknown', 'formula'))
  assert.deepEqual(result.events[0].unitNav, field(null, 'unknown', 'nav-history'))
  assert.deepEqual(result.events[0].units, actual(49.5))
  assert.deepEqual(result.confirmedSummary.byFund['000001'].units, {
    confidence: 'actual',
    source: 'formula',
    value: 49.5,
  })
})

test('covers actual fee or units independently and keeps the other fields estimated or unknown', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-12', unitNav: actual(2, 'nav-history') },
    },
    events: [
      buyEvent({
        id: 'actual-fee',
        purchaseFee: actual(101, 'platform'),
        purchaseFeeRate: field(null, 'unknown', 'fund-basic-info'),
        settlementStatus: 'settled',
      }),
      buyEvent({
        id: 'actual-units',
        purchaseFee: field(null, 'unknown', 'formula'),
        settlementStatus: 'settled',
        units: actual(47.1234, 'platform'),
      }),
    ],
  })

  const actualFee = result.events[0]
  assert.deepEqual(actualFee.purchaseFee, actual(101, 'platform'))
  assert.deepEqual(actualFee.purchaseFeeRate, field(null, 'unknown', 'fund-basic-info'))
  assert.deepEqual(actualFee.netPurchaseAmount, {
    confidence: 'estimated',
    source: 'formula',
    value: 9899,
  })
  assert.deepEqual(actualFee.units, {
    confidence: 'estimated',
    source: 'formula',
    value: 49.495,
  })

  const actualUnits = result.events[1]
  assert.deepEqual(actualUnits.units, actual(47.1234, 'platform'))
  assert.deepEqual(actualUnits.purchaseFee, {
    confidence: 'estimated',
    source: 'formula',
    value: 99,
  })
  assert.equal(actualUnits.unitNav.confidence, 'actual')
  assert.equal(actualUnits.settlementStatus, 'settled')
})

test('recalculates deterministically without mutating events or creating IDs or caches', () => {
  const events = [buyEvent()]
  const inputBefore = structuredClone(events)
  const input = {
    asOfDate: '2026-08-13',
    currentNavByFund: {
      '000001': { date: '2026-08-12', unitNav: actual(2, 'nav-history') },
    },
    events,
  }

  const first = calculatePortfolio(input)
  const second = calculatePortfolio(input)

  assert.deepEqual(first, second)
  assert.deepEqual(events, inputBefore)
  assert.equal('id' in first, false)
  assert.equal('batchId' in first.events[0], false)
})

test('consumes two confirmed buy batches in FIFO order when selling across them', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        confirmedDate: '2026-08-10',
        id: 'buy-1',
        settlementStatus: 'settled',
        totalAmount: actual(100000),
        units: actual(100),
      }),
      buyEvent({
        confirmedDate: '2026-08-11',
        id: 'buy-2',
        settlementStatus: 'settled',
        totalAmount: actual(75000),
        units: actual(50),
      }),
      sellEvent(),
    ],
  })

  assert.deepEqual(result.sellAllocations, [
    {
      buyEventId: 'buy-1',
      sellEventId: 'sell-1',
      units: field(100, 'actual', 'formula'),
      costAmount: field(100000, 'actual', 'manual'),
    },
    {
      buyEventId: 'buy-2',
      sellEventId: 'sell-1',
      units: field(20, 'actual', 'formula'),
      costAmount: field(30000, 'estimated', 'formula'),
    },
  ])
  assert.deepEqual(result.batches, [
    {
      eventId: 'buy-2',
      fundCode: '000001',
      confirmedDate: '2026-08-11',
      units: field(30, 'actual', 'manual'),
      costAmount: field(45000, 'actual', 'manual'),
    },
  ])
})

test('does not allocate zero units from an exhausted FIFO batch', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        confirmedDate: '2026-08-10',
        id: 'buy-exhausted-first',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      buyEvent({
        confirmedDate: '2026-08-11',
        id: 'buy-after-exhausted-first',
        settlementStatus: 'settled',
        totalAmount: actual(20000),
        units: actual(20),
      }),
      sellEvent({
        confirmedDate: '2026-08-12',
        id: 'sell-exhausted-first',
        units: actual(10),
      }),
      sellEvent({
        confirmedDate: '2026-08-13',
        id: 'sell-after-exhausted-first',
        units: actual(5),
      }),
    ],
  })

  assert.deepEqual(
    result.sellAllocations.map(({ buyEventId, sellEventId, units }) => ({
      buyEventId,
      sellEventId,
      units: units.value,
    })),
    [
      { buyEventId: 'buy-exhausted-first', sellEventId: 'sell-exhausted-first', units: 10 },
      {
        buyEventId: 'buy-after-exhausted-first',
        sellEventId: 'sell-after-exhausted-first',
        units: 5,
      },
    ],
  )
  assert.equal(
    result.sellAllocations.every(({ units }) => (units.value ?? 0) > 0),
    true,
  )
})

test('uses input order for same-day FIFO and excludes pending-settlement buys', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        confirmedDate: '2026-08-12',
        id: 'buy-first',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      buyEvent({
        confirmedDate: '2026-08-12',
        id: 'buy-second',
        settlementStatus: 'settled',
        totalAmount: actual(20000),
        units: actual(20),
      }),
      buyEvent({
        confirmedDate: '2026-08-12',
        id: 'buy-pending',
        totalAmount: actual(30000),
        units: actual(30),
      }),
      sellEvent({ id: 'sell-same-day', units: actual(15) }),
    ],
  })

  assert.deepEqual(
    result.sellAllocations.map(({ buyEventId, units }) => ({ buyEventId, units: units.value })),
    [
      { buyEventId: 'buy-first', units: 10 },
      { buyEventId: 'buy-second', units: 5 },
    ],
  )
  assert.equal(
    result.batches.some(({ eventId }) => eventId === 'buy-pending'),
    false,
  )
})

test('rejects a sell that exceeds available settled units without changing batches', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'buy-only',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      sellEvent({ id: 'sell-too-much', units: actual(11) }),
    ],
  })

  assert.equal(result.sellEvents[0].settlementStatus, 'pending-settlement')
  assert.deepEqual(result.sellAllocations, [])
  assert.deepEqual(result.batches[0].units, actual(10))
  assert.deepEqual(result.issues, [
    {
      code: 'insufficient-units',
      eventId: 'sell-too-much',
      fundCode: '000001',
      requestedUnits: actual(11),
      availableUnits: field(10, 'estimated', 'formula'),
    },
  ])
})

test('calculates gross redemption but keeps realized gain incomplete when redemption fee is unknown', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'buy-for-gain',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      sellEvent({ id: 'sell-unknown-fee', unitNav: actual(2, 'manual'), units: actual(10) }),
    ],
  })

  assert.deepEqual(result.sellEvents[0].grossAmount, {
    confidence: 'estimated',
    source: 'formula',
    value: 2000,
  })
  assert.deepEqual(result.sellEvents[0].redemptionFee, field(null, 'unknown', 'formula'))
  assert.deepEqual(result.sellEvents[0].netAmount, field(null, 'unknown', 'formula'))
  assert.deepEqual(result.sellEvents[0].realizedGain, field(null, 'unknown', 'formula'))
  assert.equal(result.sellEvents[0].realizedGainStatus, 'incomplete')
})

test('uses actual redemption fee to complete realized gain without estimating the fee', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'buy-with-cost',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      sellEvent({
        id: 'sell-with-fee',
        redemptionFee: actual(100, 'platform'),
        unitNav: actual(2, 'platform'),
        units: actual(10),
      }),
    ],
  })

  assert.deepEqual(result.sellEvents[0].netAmount, {
    confidence: 'estimated',
    source: 'formula',
    value: 1900,
  })
  assert.deepEqual(result.sellEvents[0].realizedGain, {
    confidence: 'estimated',
    source: 'formula',
    value: -8100,
  })
  assert.equal(result.sellEvents[0].realizedGainStatus, 'complete')
})

test('treats an actual zero net redemption as known and calculates the loss', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [
      buyEvent({
        id: 'buy-zero-proceeds',
        settlementStatus: 'settled',
        totalAmount: actual(10000),
        units: actual(10),
      }),
      sellEvent({ id: 'sell-zero-proceeds', netAmount: actual(0, 'platform'), units: actual(10) }),
    ],
  })

  assert.equal(result.sellEvents[0].netAmount.value, 0)
  assert.deepEqual(result.sellEvents[0].realizedGain, {
    confidence: 'estimated',
    source: 'formula',
    value: -10000,
  })
  assert.equal(result.sellEvents[0].realizedGainStatus, 'complete')
})

test('recomputes FIFO allocations after editing or deleting an early fact', () => {
  const events: PortfolioEvent[] = [
    buyEvent({
      confirmedDate: '2026-08-10',
      id: 'early-buy',
      settlementStatus: 'settled',
      totalAmount: actual(10000),
      units: actual(10),
    }),
    buyEvent({
      confirmedDate: '2026-08-11',
      id: 'later-buy',
      settlementStatus: 'settled',
      totalAmount: actual(20000),
      units: actual(20),
    }),
    sellEvent({ id: 'recomputed-sell', units: actual(15) }),
  ]
  const inputBefore = structuredClone(events)

  const original = calculatePortfolio({ asOfDate: '2026-08-13', currentNavByFund: {}, events })
  const edited = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [{ ...events[0], totalAmount: actual(15000) } as PortfolioBuyEvent, ...events.slice(1)],
  })
  const deleted = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: events.slice(1),
  })

  assert.equal(original.sellAllocations[0].costAmount.value, 10000)
  assert.equal(edited.sellAllocations[0].costAmount.value, 15000)
  assert.equal(deleted.sellAllocations[0].buyEventId, 'later-buy')
  assert.deepEqual(events, inputBefore)
  assert.deepEqual(
    original,
    calculatePortfolio({ asOfDate: '2026-08-13', currentNavByFund: {}, events }),
  )
})

test('treats a settled initial holding as a FIFO batch', () => {
  const result = calculatePortfolio({
    asOfDate: '2026-08-13',
    currentNavByFund: {},
    events: [initialHoldingEvent(), sellEvent({ id: 'sell-initial', units: actual(20) })],
  })

  assert.equal(result.sellAllocations[0].buyEventId, 'initial-1')
  assert.equal(result.sellAllocations[0].units.value, 20)
  assert.equal(result.batches[0].eventId, 'initial-1')
  assert.equal(result.batches[0].units.value, 80)
})
