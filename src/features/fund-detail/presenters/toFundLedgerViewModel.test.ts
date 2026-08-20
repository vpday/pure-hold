import assert from 'node:assert/strict'
import test from 'node:test'

import { createCoordinationFailureFact } from '@/app/coordination/coordinationFailure.ts'
import type {
  FieldValue,
  PortfolioAdjustmentEvent,
  PortfolioBuyEvent,
  PortfolioCashDividendEvent,
  PortfolioDividendReinvestmentEvent,
  PortfolioInitialHoldingEvent,
  PortfolioSellEvent,
} from '@/domains/portfolio/models/index.ts'
import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
import { calculatePortfolio } from '@/domains/portfolio/services/calculatePortfolio.ts'
import { toFundLedgerViewModel, toLedgerRecordViewModels } from './toFundLedgerViewModel.ts'

const fundCode = '000001'

function actual(
  value: number,
  source: FieldValue<number>['source'] = 'manual',
): FieldValue<number> {
  return { confidence: 'actual', source, value }
}

function unknown(value: null = null): FieldValue<number> {
  return { confidence: 'unknown', source: 'manual', value }
}

const initial: PortfolioInitialHoldingEvent = {
  auditedAt: '2026-08-01T00:00:00.000Z',
  confirmedDate: '2026-08-01',
  costAmount: actual(100000),
  createdAt: '2026-08-01T00:00:00.000Z',
  fundCode,
  id: 'initial',
  kind: 'initial-holding',
  settlementStatus: 'settled',
  source: 'initial-holding',
  units: actual(100),
  updatedAt: '2026-08-01T00:00:00.000Z',
}

function buyEvent(id: string, confirmedDate: string, submittedAt: string): PortfolioBuyEvent {
  return {
    auditedAt: `${confirmedDate}T00:00:00.000Z`,
    confirmedDate,
    createdAt: `${confirmedDate}T00:00:00.000Z`,
    entryMode: 'historical',
    fundCode,
    id,
    kind: 'buy',
    navDate: confirmedDate,
    purchaseFee: actual(0),
    purchaseFeeRate: actual(0),
    settlementStatus: 'settled',
    source: 'manual',
    submittedAt,
    totalAmount: actual(10000),
    unitNav: actual(10),
    units: actual(10),
    updatedAt: `${confirmedDate}T00:00:00.000Z`,
  }
}

const cashDividend: PortfolioCashDividendEvent = {
  auditedAt: '2026-08-06T00:00:00.000Z',
  cashAmount: actual(500),
  confirmedDate: '2026-08-06',
  createdAt: '2026-08-06T00:00:00.000Z',
  fundCode,
  id: 'cash-dividend',
  kind: 'cash-dividend',
  settlementStatus: 'settled',
  source: 'manual',
  updatedAt: '2026-08-06T00:00:00.000Z',
}

const dividendReinvestment: PortfolioDividendReinvestmentEvent = {
  auditedAt: '2026-08-07T00:00:00.000Z',
  confirmedDate: '2026-08-07',
  createdAt: '2026-08-07T00:00:00.000Z',
  dividendAmount: actual(1000),
  fundCode,
  id: 'dividend-reinvestment',
  kind: 'dividend-reinvestment',
  settlementStatus: 'settled',
  source: 'dividend-reinvestment',
  unitNav: actual(10),
  units: actual(1),
  updatedAt: '2026-08-07T00:00:00.000Z',
}

const adjustment: PortfolioAdjustmentEvent = {
  auditedAt: '2026-08-08T00:00:00.000Z',
  confirmedDate: '2026-08-08',
  createdAt: '2026-08-08T00:00:00.000Z',
  fundCode,
  id: 'adjustment',
  kind: 'adjustment',
  reason: '手工对账修正',
  settlementStatus: 'settled',
  source: 'adjustment',
  targetCostAmount: actual(101000),
  targetUnits: actual(101),
  updatedAt: '2026-08-08T00:00:00.000Z',
}

const sell: PortfolioSellEvent = {
  auditedAt: '2026-08-09T00:00:00.000Z',
  confirmedDate: '2026-08-09',
  createdAt: '2026-08-09T00:00:00.000Z',
  entryMode: 'historical',
  fundCode,
  grossAmount: actual(2000),
  id: 'sell',
  kind: 'sell',
  navDate: '2026-08-09',
  netAmount: actual(1990),
  redemptionFee: actual(10),
  requestedUnits: actual(2),
  settlementStatus: 'settled',
  source: 'manual',
  submittedAt: '2026-08-09 10:00',
  unitNav: actual(20),
  units: actual(2),
  updatedAt: '2026-08-09T00:00:00.000Z',
}

function calculate(events: Parameters<typeof calculatePortfolio>[0]['events']) {
  return calculatePortfolio({ asOfDate: '2026-08-10', currentNavByFund: {}, events })
}

test('maps all ledger event kinds and restricts editing to buy and sell', () => {
  const events = [
    initial,
    buyEvent('buy', '2026-08-02', '2026-08-02 10:00'),
    sell,
    cashDividend,
    dividendReinvestment,
    adjustment,
  ]
  const rows = toLedgerRecordViewModels(events, calculate(events), fundCode)

  assert.deepEqual(
    rows.map(({ kind }) => kind),
    ['sell', 'adjustment', 'dividend-reinvestment', 'cash-dividend', 'buy', 'initial-holding'],
  )
  assert.deepEqual(
    rows.map(({ kind, canEdit, canDelete }) => ({ kind, canEdit, canDelete })),
    [
      { canDelete: true, canEdit: true, kind: 'sell' },
      { canDelete: false, canEdit: false, kind: 'adjustment' },
      { canDelete: false, canEdit: false, kind: 'dividend-reinvestment' },
      { canDelete: false, canEdit: false, kind: 'cash-dividend' },
      { canDelete: true, canEdit: true, kind: 'buy' },
      { canDelete: false, canEdit: false, kind: 'initial-holding' },
    ],
  )
  assert.equal(rows.find(({ kind }) => kind === 'sell')?.costBasisAmount.text, '¥20.00')
  assert.equal(rows.find(({ kind }) => kind === 'initial-holding')?.kindText, '初始持仓')
  assert.equal(rows.find(({ kind }) => kind === 'initial-holding')?.amountLabel, '')
  assert.equal(rows.find(({ kind }) => kind === 'buy')?.amountLabel, '')
  assert.equal(rows.find(({ kind }) => kind === 'buy')?.feeLabel, '')
  assert.equal(rows.find(({ kind }) => kind === 'sell')?.amountLabel, '净额')
  assert.equal(rows.find(({ kind }) => kind === 'sell')?.costBasisLabel, '移动平均成本')
  assert.equal(rows.find(({ kind }) => kind === 'adjustment')?.reasonText, '手工对账修正')
})

test('preserves fractional units and hides only duplicate manual field sources', () => {
  const event = {
    ...buyEvent('fractional', '2026-08-10', '2026-08-10 10:00'),
    unitNav: actual(0.665, 'nav-history'),
    units: actual(750.125),
  }
  const row = toLedgerRecordViewModels([event], undefined, fundCode)[0]

  assert.equal(row?.units.text, '750.125')
  assert.equal(row?.units.sourceVisible, false)
  assert.equal(row?.fee.sourceVisible, false)
  assert.equal(row?.unitNav.text, '0.665')
  assert.equal(row?.unitNav.sourceVisible, true)

  const estimatedRow = toLedgerRecordViewModels(
    [
      {
        ...event,
        id: 'estimated',
        units: { confidence: 'estimated' as const, source: 'manual' as const, value: 750.125 },
      },
    ],
    undefined,
    fundCode,
  )[0]
  assert.equal(estimatedRow?.units.sourceVisible, true)
})

test('puts pending records first and reverses saved order for equal dates without mutating input', () => {
  const first = buyEvent('same-day-first', '2026-08-05', '2026-08-05 09:00')
  const second = buyEvent('same-day-second', '2026-08-05', '2026-08-05 10:00')
  const pending: PortfolioBuyEvent = {
    ...buyEvent('pending', '2026-08-04', '2026-08-04 10:00'),
    confirmedDate: undefined,
    settlementStatus: 'pending-settlement',
    units: unknown(),
  }
  const events = [initial, first, second, pending]
  const originalIds = events.map(({ id }) => id)
  const rows = toLedgerRecordViewModels(events, calculate(events), fundCode)

  assert.deepEqual(
    rows.map(({ id }) => id),
    ['pending', 'same-day-second', 'same-day-first', 'initial'],
  )
  assert.equal(rows[0]?.pending, true)
  assert.deepEqual(
    events.map(({ id }) => id),
    originalIds,
  )
})

test('keeps an insufficient sell visible as an issue while preserving edit and delete permissions', () => {
  const issueSell: PortfolioSellEvent = {
    ...sell,
    id: 'issue-sell',
    requestedUnits: actual(200),
    units: actual(200),
  }
  const events = [initial, issueSell]
  const row = toLedgerRecordViewModels(events, calculate(events), fundCode)[0]

  assert.equal(row?.status, 'issue')
  assert.equal(row?.canEdit, true)
  assert.equal(row?.canDelete, true)
  assert.equal(row?.costBasisAmount.text, '--')
})

test('presents aggregate position and stable coordination status', () => {
  const events = [initial, sell, cashDividend]
  const calculation = calculatePortfolio({
    asOfDate: '2026-08-10',
    currentNavByFund: {
      [fundCode]: { date: '2026-08-10', unitNav: actual(12) },
    },
    events,
  })
  const model = toFundLedgerViewModel({
    canCorrect: true,
    canRecord: true,
    fundCode,
    holding: null,
    ledger: { costAmount: actual(98000), fundCode, units: actual(98) },
    portfolio: createEmptyPortfolio(),
    retryable: false,
    status: 'synced',
    ok: true,
    calculation,
  })

  assert.equal(model.status, 'synced')
  assert.equal(model.statusText, '已同步')
  assert.equal(model.statusTone, 'success')
  assert.equal(model.position?.averageCost.text, '¥10')
  assert.equal(model.position?.costAmount.text, '¥980.00')
  assert.equal(model.position?.units.text, '98')
})

test('keeps correction available while exact facts are pending', () => {
  const model = toFundLedgerViewModel({
    canCorrect: true,
    canRecord: true,
    fundCode,
    holding: null,
    ledger: { costAmount: unknown(), fundCode, units: unknown() },
    portfolio: createEmptyPortfolio(),
    retryable: true,
    status: 'pending-exact-data',
    ok: false,
  })

  assert.equal(model.status, 'pending-exact-data')
  assert.equal(model.statusText, '待精确数据')
  assert.equal(model.statusTone, 'warning')
  assert.equal(model.canCorrect, true)
  assert.equal(model.retryAvailable, true)
  assert.equal(model.position?.averageCost.text, '--')
})

test('does not present a ledger error as a synchronized projection', () => {
  const model = toFundLedgerViewModel({
    canCorrect: false,
    canRecord: false,
    fundCode,
    holding: null,
    ledger: null,
    failure: createCoordinationFailureFact('partial'),
    portfolio: createEmptyPortfolio(),
    retryable: true,
    status: 'ledger-error',
    ok: false,
  })

  assert.equal(model.status, 'ledger-error')
  assert.equal(model.statusText, '账本异常')
  assert.equal(model.statusTone, 'error')
  assert.equal(model.hasPartialPersistence, true)
  assert.equal(model.position, null)
})
