import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundHolding } from '@/domains/funds/models/fundHolding.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import type { FieldValue, Portfolio, PortfolioEvent } from '@/domains/portfolio/models/index.ts'
import { createPortfolioStore } from '@/domains/portfolio/stores/createPortfolioStore.ts'

import {
  createPortfolioCoordinator,
  initialHoldingEventId,
  type FundsPortfolioFacade,
} from './portfolioCoordinator.ts'

const actual = (value: number, source: FieldValue<number>['source'] = 'manual') => ({
  confidence: 'actual' as const,
  source,
  value,
})

function holding(overrides: Partial<FundHolding> = {}): FundHolding {
  return {
    code: '000001',
    dividendMode: 'cash',
    purchaseDate: '2024-01-01',
    totalCostCents: 12000,
    units: 100,
    ...overrides,
  }
}

function settings(overrides: Partial<FundSettings> = {}): FundSettings {
  return {
    funds: [
      { code: '000001', name: '基金一' },
      { code: '000002', name: '基金二' },
    ],
    groups: [],
    holdingOrder: ['000001'],
    holdingsByCode: { '000001': holding() },
    ...overrides,
  }
}

function emptyPortfolio(): Portfolio {
  return { events: [], fundCodes: [] }
}

function initialHoldingEvent(
  fundCode: string,
  overrides: Partial<PortfolioEvent> = {},
): PortfolioEvent {
  return {
    auditedAt: '2026-08-14T09:00:00.000Z',
    confirmedDate: '2024-01-01',
    costAmount: actual(12000, 'migration'),
    createdAt: '2026-08-14T09:00:00.000Z',
    fundCode,
    id: initialHoldingEventId(fundCode),
    kind: 'initial-holding',
    settlementStatus: 'settled',
    source: 'initial-holding',
    units: actual(100, 'migration'),
    updatedAt: '2026-08-14T09:00:00.000Z',
    ...overrides,
  } as PortfolioEvent
}

function cashDividendEvent(fundCode: string, id: string): PortfolioEvent {
  return {
    auditedAt: '2026-08-14T09:00:00.000Z',
    cashAmount: actual(100),
    confirmedDate: '2024-02-01',
    createdAt: '2026-08-14T09:00:00.000Z',
    fundCode,
    id,
    kind: 'cash-dividend',
    settlementStatus: 'settled',
    source: 'manual',
    updatedAt: '2026-08-14T09:00:00.000Z',
  }
}

function adjustmentEvent(fundCode: string, id: string): PortfolioEvent {
  return {
    auditedAt: '2026-08-14T09:00:00.000Z',
    confirmedDate: '2024-03-01',
    createdAt: '2026-08-14T09:00:00.000Z',
    fundCode,
    id,
    kind: 'adjustment',
    reason: '平台对账',
    settlementStatus: 'settled',
    source: 'adjustment',
    targetCostAmount: actual(12000),
    targetUnits: actual(101),
    updatedAt: '2026-08-14T09:00:00.000Z',
  }
}

function reinvestmentEvent(fundCode: string, id: string): PortfolioEvent {
  return {
    auditedAt: '2026-08-14T09:00:00.000Z',
    confirmedDate: '2024-04-01',
    createdAt: '2026-08-14T09:00:00.000Z',
    dividendAmount: actual(100),
    fundCode,
    id,
    kind: 'dividend-reinvestment',
    settlementStatus: 'settled',
    source: 'dividend-reinvestment',
    unitNav: actual(1),
    units: actual(1),
    updatedAt: '2026-08-14T09:00:00.000Z',
  }
}

function pendingBuyEvent(fundCode: string, id: string): PortfolioEvent {
  return {
    auditedAt: '2026-08-14T09:00:00.000Z',
    createdAt: '2026-08-14T09:00:00.000Z',
    entryMode: 'pending',
    fundCode,
    id,
    kind: 'buy',
    navDate: '2026-08-14',
    purchaseFee: actual(0),
    purchaseFeeRate: actual(0),
    settlementStatus: 'pending-settlement',
    source: 'manual',
    submittedAt: '2026-08-14 09:00',
    totalAmount: actual(1000),
    unitNav: actual(1),
    units: actual(10),
    updatedAt: '2026-08-14T09:00:00.000Z',
  } as PortfolioEvent
}

function confirmedBuyEvent(fundCode: string, id: string): PortfolioEvent {
  return {
    auditedAt: '2026-08-14T09:00:00.000Z',
    confirmedDate: '2026-08-14',
    createdAt: '2026-08-14T09:00:00.000Z',
    entryMode: 'historical',
    fundCode,
    id,
    kind: 'buy',
    navDate: '2026-08-14',
    purchaseFee: actual(0),
    purchaseFeeRate: actual(0),
    settlementStatus: 'settled',
    source: 'manual',
    submittedAt: '2026-08-14 09:00',
    totalAmount: actual(1000),
    unitNav: actual(100),
    units: actual(10),
    updatedAt: '2026-08-14T09:00:00.000Z',
  }
}

function fullSellEvent(fundCode: string, id: string): PortfolioEvent {
  return {
    auditedAt: '2026-08-14T09:00:00.000Z',
    confirmedDate: '2026-08-14',
    createdAt: '2026-08-14T09:00:00.000Z',
    entryMode: 'historical',
    fundCode,
    grossAmount: actual(10000),
    id,
    kind: 'sell',
    navDate: '2026-08-14',
    netAmount: actual(10000),
    redemptionFee: actual(0),
    requestedUnits: actual(100),
    settlementStatus: 'settled',
    source: 'manual',
    submittedAt: '2026-08-14 09:00',
    unitNav: actual(1),
    units: actual(100),
    updatedAt: '2026-08-14T09:00:00.000Z',
  }
}

function insufficientSellEvent(fundCode: string, id: string): PortfolioEvent {
  return {
    auditedAt: '2026-08-14T09:00:00.000Z',
    confirmedDate: '2026-08-14',
    createdAt: '2026-08-14T09:00:00.000Z',
    entryMode: 'historical',
    fundCode,
    grossAmount: actual(10100),
    id,
    kind: 'sell',
    navDate: '2026-08-14',
    netAmount: actual(10100),
    redemptionFee: actual(0),
    requestedUnits: actual(101),
    settlementStatus: 'settled',
    source: 'manual',
    submittedAt: '2026-08-14 09:00',
    unitNav: actual(1),
    units: actual(101),
    updatedAt: '2026-08-14T09:00:00.000Z',
  } as PortfolioEvent
}

type TestFundsFacade = FundsPortfolioFacade & {
  readonly setHolding: (holding: FundHolding) => void
}

function createFundsFacade(
  initial: FundSettings,
  failDelete = false,
  failProjection = false,
  options: {
    readonly failSettingsRestore?: boolean
    readonly mutateProjectionBeforeFailure?: boolean
    readonly operationLog?: string[]
  } = {},
): TestFundsFacade {
  let current = structuredClone(initial)
  return {
    deleteFund(code) {
      options.operationLog?.push('funds:delete')
      if (failDelete) return { error: '保存失败' }
      current = {
        ...current,
        funds: current.funds.filter(({ code: fundCode }) => fundCode !== code),
        groups: current.groups.map((group) => ({
          ...group,
          fundCodes: group.fundCodes.filter((fundCode) => fundCode !== code),
        })),
        holdingOrder: current.holdingOrder.filter((fundCode) => fundCode !== code),
        holdingsByCode: Object.fromEntries(
          Object.entries(current.holdingsByCode).filter(([fundCode]) => fundCode !== code),
        ),
      }
      return {}
    },
    getSettingsSnapshot() {
      options.operationLog?.push('funds:snapshot')
      return structuredClone(current)
    },
    replaceHoldingProjection(nextHolding: FundHolding) {
      options.operationLog?.push('funds:projection')
      if (failProjection && options.mutateProjectionBeforeFailure) {
        current = {
          ...current,
          holdingOrder: current.holdingOrder.includes(nextHolding.code)
            ? current.holdingOrder
            : [...current.holdingOrder, nextHolding.code],
          holdingsByCode: { ...current.holdingsByCode, [nextHolding.code]: nextHolding },
        }
      }
      if (failProjection) {
        return {
          error: new Error('projection quota exceeded'),
          ok: false,
          reason: 'persistence-failed' as const,
        }
      }
      current = {
        ...current,
        holdingOrder: current.holdingOrder.includes(nextHolding.code)
          ? current.holdingOrder
          : [...current.holdingOrder, nextHolding.code],
        holdingsByCode: { ...current.holdingsByCode, [nextHolding.code]: nextHolding },
      }
      return { ok: true as const }
    },
    replaceSettingsPersisted(nextSettings: FundSettings) {
      options.operationLog?.push('funds:restore')
      if (options.failSettingsRestore) {
        return {
          error: new Error('settings restore failed'),
          ok: false,
          reason: 'persistence-failed' as const,
        }
      }
      current = structuredClone(nextSettings)
      return { ok: true as const }
    },
    setHolding(nextHolding: FundHolding) {
      current = {
        ...current,
        holdingOrder: current.holdingOrder.includes(nextHolding.code)
          ? current.holdingOrder
          : [...current.holdingOrder, nextHolding.code],
        holdingsByCode: { ...current.holdingsByCode, [nextHolding.code]: nextHolding },
      }
    },
    updateHoldingMetadata(input) {
      options.operationLog?.push('funds:metadata')
      const existing = current.holdingsByCode[input.code]
      current = {
        ...current,
        holdingOrder: existing ? current.holdingOrder : [...current.holdingOrder, input.code],
        holdingsByCode: {
          ...current.holdingsByCode,
          [input.code]: {
            code: input.code,
            dividendMode: input.dividendMode,
            purchaseDate: input.purchaseDate,
            totalCostCents: existing?.totalCostCents ?? 0,
            units: existing?.units ?? 0,
          },
        },
      }
      return { ok: true as const }
    },
  }
}

function createCoordinator(
  initialSettings: FundSettings = settings(),
  initial: Portfolio = emptyPortfolio(),
  options: {
    readonly failDeleteFund?: boolean
    readonly failPortfolioWrites?: boolean
    readonly failPortfolioWritesAfter?: number
    readonly failProjection?: boolean
    readonly failSettingsRestore?: boolean
    readonly mutateProjectionBeforeFailure?: boolean
    readonly now?: () => string
    readonly operationLog?: string[]
  } = {},
) {
  const funds = createFundsFacade(initialSettings, options.failDeleteFund, options.failProjection, {
    failSettingsRestore: options.failSettingsRestore,
    mutateProjectionBeforeFailure: options.mutateProjectionBeforeFailure,
    operationLog: options.operationLog,
  })
  const writes: Portfolio[] = []
  const portfolioStore = createPortfolioStore(initial, (candidate) => {
    options.operationLog?.push('portfolio:write')
    if (
      options.failPortfolioWrites ||
      (options.failPortfolioWritesAfter !== undefined &&
        writes.length >= options.failPortfolioWritesAfter)
    ) {
      throw new Error('quota exceeded')
    }
    writes.push(candidate)
  })
  const portfolio = {
    ...portfolioStore,
    getPortfolio() {
      options.operationLog?.push('portfolio:snapshot')
      return portfolioStore.getPortfolio()
    },
  }
  return {
    coordinator: createPortfolioCoordinator({
      funds,
      now: options.now ?? (() => '2026-08-14T09:00:00.000Z'),
      portfolio,
    }),
    funds,
    portfolio,
    writes,
  }
}

function assertSnapshotsBeforeFirstWrite(operations: readonly string[]): void {
  const writeOperations = new Set([
    'funds:delete',
    'funds:metadata',
    'funds:projection',
    'funds:restore',
    'portfolio:write',
  ])
  const firstWrite = operations.findIndex((operation) => writeOperations.has(operation))
  assert.notEqual(firstWrite, -1, operations.join(' → '))
  const beforeWrite = operations.slice(0, firstWrite)
  assert.ok(beforeWrite.filter((operation) => operation === 'portfolio:snapshot').length >= 2)
  assert.ok(beforeWrite.filter((operation) => operation === 'funds:snapshot').length >= 2)
}

test('automatically creates and updates one stable initial-holding event', () => {
  let now = '2026-08-14T09:00:00.000Z'
  const { coordinator, funds, portfolio, writes } = createCoordinator(
    settings(),
    emptyPortfolio(),
    { now: () => now },
  )

  const first = coordinator.ensureFundLedger({ fundCode: '000001' })
  now = '2026-08-15T09:00:00.000Z'
  funds.setHolding(holding({ totalCostCents: 8100, units: 9 }))
  const second = coordinator.ensureFundLedger({ fundCode: '000001' })

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (!first.ok || !second.ok) return
  assert.equal(first.event.id, 'initial-holding:000001')
  assert.equal(second.status, 'updated-initial-holding')
  assert.deepEqual(first.event, {
    auditedAt: '2026-08-14T09:00:00.000Z',
    confirmedDate: '2026-08-14',
    costAmount: actual(12000, 'migration'),
    createdAt: '2026-08-14T09:00:00.000Z',
    fundCode: '000001',
    id: 'initial-holding:000001',
    kind: 'initial-holding',
    settlementStatus: 'settled',
    source: 'initial-holding',
    units: actual(100, 'migration'),
    updatedAt: '2026-08-14T09:00:00.000Z',
  })
  assert.equal(second.event.confirmedDate, first.event.confirmedDate)
  assert.equal(second.event.createdAt, first.event.createdAt)
  assert.equal(second.event.auditedAt, first.event.auditedAt)
  assert.equal(second.event.updatedAt, '2026-08-15T09:00:00.000Z')
  assert.deepEqual(second.event.units, actual(9, 'migration'))
  assert.deepEqual(second.event.costAmount, actual(8100, 'migration'))
  assert.equal(portfolio.getPortfolio().events.length, 1)
  assert.deepEqual(portfolio.getPortfolio().fundCodes, ['000001'])
  assert.equal(writes.length, 3)
})

test('creates an initial ledger for a valid four-decimal holding with floating-point noise', () => {
  const { coordinator, portfolio } = createCoordinator(
    settings({
      funds: [{ code: '014674', name: '富国中证港股通互联网ETF发起式联接C' }],
      holdingOrder: ['014674'],
      holdingsByCode: {
        '014674': holding({
          code: '014674',
          purchaseDate: '2025-08-21',
          totalCostCents: 701326,
          units: 10573.29,
        }),
      },
    }),
    emptyPortfolio(),
  )

  const first = coordinator.ensureFundLedger({ fundCode: '014674' })
  const retry = coordinator.ensureFundLedger({ fundCode: '014674' })

  assert.equal(first.ok, true)
  assert.equal(retry.ok, true)
  if (!first.ok || !retry.ok) return
  assert.deepEqual(first.event.units, actual(10573.29, 'migration'))
  assert.deepEqual(first.event.costAmount, actual(701326, 'migration'))
  assert.deepEqual(retry.event, first.event)
  assert.deepEqual(portfolio.getPortfolio().fundCodes, ['014674'])
  assert.equal(portfolio.getPortfolio().events.length, 1)
})

test('uses the first successful save Shanghai date and never invents a holding', () => {
  const nextDay = createCoordinator(settings(), emptyPortfolio(), {
    now: () => '2026-08-14T16:30:00.000Z',
  }).coordinator.ensureFundLedger({ fundCode: '000001' })
  assert.equal(nextDay.ok, true)
  if (!nextDay.ok) return
  assert.equal(nextDay.event.confirmedDate, '2026-08-15')

  const { coordinator, portfolio } = createCoordinator(
    settings({ holdingsByCode: {} }),
    emptyPortfolio(),
  )
  const empty = coordinator.ensureFundLedger({ fundCode: '000002' })
  assert.deepEqual(empty, {
    fundCode: '000002',
    ok: false,
    partialPersistence: false,
    portfolio: emptyPortfolio(),
    reason: 'missing-fund-holding',
    retryable: false,
  })
  assert.deepEqual(portfolio.getPortfolio(), emptyPortfolio())
})

test('locks the initial event for every saved follow-up event, including unusable events', () => {
  const followUps = [
    cashDividendEvent('000001', 'cash-1'),
    reinvestmentEvent('000001', 'reinvestment-1'),
    adjustmentEvent('000001', 'adjustment-1'),
    pendingBuyEvent('000001', 'pending-buy-1'),
    insufficientSellEvent('000001', 'insufficient-sell-1'),
  ]

  for (const followUp of followUps) {
    const initial = initialHoldingEvent('000001')
    const { coordinator, funds, portfolio } = createCoordinator(settings(), {
      events: [initial, followUp],
      fundCodes: ['000001'],
    })
    funds.setHolding(holding({ totalCostCents: 8100, units: 9 }))

    const result = coordinator.ensureFundLedger({ fundCode: '000001' })

    assert.equal(result.ok, true)
    if (!result.ok) continue
    assert.equal(result.status, 'locked')
    assert.equal(result.reconciliation.initialEventLocked, true)
    assert.deepEqual(result.event, initial)
    assert.deepEqual(portfolio.getPortfolio().events[0], initial)
    if (followUp.kind === 'sell') {
      assert.equal(result.reconciliation.calculation.issues[0]?.eventId, followUp.id)
    }
    const expectedUnits =
      followUp.kind === 'dividend-reinvestment' || followUp.kind === 'adjustment' ? 101 : 100
    const expectedCost = followUp.kind === 'dividend-reinvestment' ? 12100 : 12000
    assert.deepEqual(result.reconciliation.difference, {
      costAmountCents: expectedCost - 9 * 9 * 100,
      units: expectedUnits - 9,
    })
  }
})

test('reconciles confirmed ledger units and cost without writing either facade', () => {
  const { coordinator, writes } = createCoordinator(settings(), {
    events: [initialHoldingEvent('000001')],
    fundCodes: ['000001'],
  })

  const reconciliation = coordinator.reconcileFund({
    asOfDate: '2026-08-14',
    currentNavByFund: {},
    fundCode: '000001',
  })

  assert.equal(reconciliation.availability, 'available')
  assert.equal(reconciliation.ledger?.units.value, 100)
  assert.equal(reconciliation.ledger?.costAmount.value, 12000)
  assert.equal(reconciliation.ledgerEnabled, true)
  assert.equal(reconciliation.initialEventLocked, false)
  assert.deepEqual(reconciliation.difference, { costAmountCents: 0, units: 0 })
  assert.equal(writes.length, 0)
})

test('reports explicit reconciliation differences and missing-data availability', () => {
  const { coordinator } = createCoordinator(
    settings({ holdingsByCode: { '000001': holding({ totalCostCents: 13000 }) } }),
    { events: [initialHoldingEvent('000001')], fundCodes: ['000001'] },
  )
  const changed = coordinator.reconcileFund({
    asOfDate: '2026-08-14',
    currentNavByFund: {},
    fundCode: '000001',
  })
  assert.equal(changed.availability, 'available')
  assert.deepEqual(changed.difference, { costAmountCents: -1000, units: 0 })

  const missingHolding = createCoordinator(settings({ holdingsByCode: {} }), {
    events: [initialHoldingEvent('000001')],
    fundCodes: ['000001'],
  }).coordinator.reconcileFund({ asOfDate: '2026-08-14', currentNavByFund: {}, fundCode: '000001' })
  assert.equal(missingHolding.availability, 'missing-fund-holding')

  const missingLedger = createCoordinator(settings()).coordinator.reconcileFund({
    asOfDate: '2026-08-14',
    currentNavByFund: {},
    fundCode: '000001',
  })
  assert.equal(missingLedger.availability, 'missing-ledger')
})

test('returns a retryable, idempotent result when automatic ledger persistence fails', () => {
  const { coordinator, portfolio } = createCoordinator(settings(), emptyPortfolio(), {
    failPortfolioWrites: true,
  })

  const first = coordinator.ensureFundLedger({ fundCode: '000001' })
  const retry = coordinator.ensureFundLedger({ fundCode: '000001' })

  assert.equal(first.ok, false)
  assert.equal(retry.ok, false)
  if (first.ok || retry.ok) return
  assert.equal(first.reason, 'portfolio-persistence-failed')
  assert.equal(first.retryable, true)
  assert.equal(first.partialPersistence, false)
  assert.deepEqual(first.portfolio, emptyPortfolio())
  assert.deepEqual(retry.portfolio, emptyPortfolio())
  assert.deepEqual(portfolio.getPortfolio(), emptyPortfolio())
})

test('prepares read-only deletion statistics and cancellation performs no writes', () => {
  const initial: Portfolio = {
    events: [
      initialHoldingEvent('000001'),
      cashDividendEvent('000001', 'cash-1'),
      adjustmentEvent('000001', 'adjustment-1'),
      reinvestmentEvent('000001', 'reinvestment-1'),
      initialHoldingEvent('000002'),
    ],
    fundCodes: ['000001', '000002'],
  }
  const { coordinator, portfolio, writes } = createCoordinator(settings(), initial)
  const before = portfolio.getPortfolio()

  const prepared = coordinator.prepareFundDeletion('000001')
  assert.deepEqual(prepared, {
    ok: true,
    preview: {
      fundCode: '000001',
      fundName: '基金一',
      stats: {
        adjustmentCount: 1,
        cashDividendCount: 1,
        dividendReinvestmentCount: 1,
        eventCount: 4,
      },
    },
  })
  assert.deepEqual(portfolio.getPortfolio(), before)
  assert.equal(writes.length, 0)
})

test('confirms deletion only for the target fund and is idempotent', () => {
  const initial: Portfolio = {
    events: [initialHoldingEvent('000001'), initialHoldingEvent('000002')],
    fundCodes: ['000001', '000002'],
  }
  const { coordinator, funds, portfolio } = createCoordinator(settings(), initial)
  const prepared = coordinator.prepareFundDeletion('000001')
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return

  const deleted = coordinator.confirmFundDeletion(prepared.preview)
  assert.equal(deleted.ok, true)
  assert.deepEqual(portfolio.getPortfolio(), {
    events: [initialHoldingEvent('000002')],
    fundCodes: ['000002'],
  })
  assert.equal(
    funds.getSettingsSnapshot().funds.some(({ code }) => code === '000001'),
    false,
  )
  const repeated = coordinator.confirmFundDeletion(prepared.preview)
  assert.deepEqual(repeated, { ok: true, preview: prepared.preview, status: 'already-absent' })
  assert.deepEqual(portfolio.getPortfolio().fundCodes, ['000002'])
})

test('commitEvent and deleteEvent capture both domain snapshots before any write', () => {
  const commitOperations: string[] = []
  const committed = createCoordinator(settings({ holdingsByCode: {} }), emptyPortfolio(), {
    operationLog: commitOperations,
  })
  const commitResult = committed.coordinator.commitEvent({
    asOfDate: '2026-08-14',
    event: confirmedBuyEvent('000002', 'capture-commit'),
  })
  assert.equal(commitResult.error, undefined)
  assertSnapshotsBeforeFirstWrite(commitOperations)

  const deleteOperations: string[] = []
  const deleted = createCoordinator(
    settings(),
    { events: [initialHoldingEvent('000001')], fundCodes: ['000001'] },
    { operationLog: deleteOperations },
  )
  const deleteResult = deleted.coordinator.deleteEvent(initialHoldingEventId('000001'))
  assert.equal(deleteResult.error, undefined)
  assertSnapshotsBeforeFirstWrite(deleteOperations)
})

test('restores portfolio when Funds deletion fails and reports old state', () => {
  const initial: Portfolio = {
    events: [initialHoldingEvent('000001'), initialHoldingEvent('000002')],
    fundCodes: ['000001', '000002'],
  }
  const operations: string[] = []
  const { coordinator, funds, portfolio } = createCoordinator(settings(), initial, {
    failDeleteFund: true,
    operationLog: operations,
  })
  const prepared = coordinator.prepareFundDeletion('000001')
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return

  const result = coordinator.confirmFundDeletion(prepared.preview)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.reason, 'funds-persistence-failed')
  assert.equal(result.partialPersistence, false)
  assert.deepEqual(
    portfolio
      .getPortfolio()
      .events.map(({ id }) => id)
      .sort(),
    initial.events.map(({ id }) => id).sort(),
  )
  assert.deepEqual([...portfolio.getPortfolio().fundCodes].sort(), [...initial.fundCodes].sort())
  assert.equal(funds.getSettingsSnapshot().funds.length, 2)
  assert.equal(operations.filter((operation) => operation === 'funds:delete').length, 1)
  assert.equal(operations.filter((operation) => operation === 'funds:restore').length, 0)
  const fundsDelete = operations.indexOf('funds:delete')
  assert.ok(operations.slice(fundsDelete + 1).includes('portfolio:write'))
})

test('returns a verifiable partial-persistence result when rollback also fails', () => {
  const initial: Portfolio = {
    events: [initialHoldingEvent('000001')],
    fundCodes: ['000001'],
  }
  let writes = 0
  const funds = createFundsFacade(settings())
  const portfolio = createPortfolioStore(initial, (candidate) => {
    writes += 1
    if (writes > 1) throw new Error('quota exceeded')
    void candidate
  })
  const coordinator = createPortfolioCoordinator({ funds, portfolio })
  const prepared = coordinator.prepareFundDeletion('000001')
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return

  const result = coordinator.confirmFundDeletion(prepared.preview)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.partialPersistence, true)
  assert.equal(result.portfolio.events.length, 0)
  assert.equal(result.portfolio.fundCodes.includes('000001'), true)
})

test('commits a correction through one seam and projects exact total cost cents', () => {
  const { coordinator, funds, portfolio } = createCoordinator()

  const result = coordinator.commitHoldingCorrection({
    asOfDate: '2026-08-14',
    confirmedDate: '2026-08-14',
    eventId: 'correction-1',
    fundCode: '000001',
    reason: '平台对账',
    targetUnits: 120,
    totalCostCents: 15001,
  })

  assert.equal(result.status, 'synced')
  assert.equal(result.partialPersistence, false)
  assert.equal(result.holding?.units, 120)
  assert.equal(result.holding?.totalCostCents, 15001)
  assert.deepEqual(
    portfolio.getPortfolio().events.map(({ id }) => id),
    ['initial-holding:000001', 'correction-1'],
  )
  assert.equal(funds.getSettingsSnapshot().holdingsByCode['000001']?.totalCostCents, 15001)
})

test('keeps the last valid projection while a pending event awaits confirmation', () => {
  const operations: string[] = []
  const { coordinator, funds, portfolio } = createCoordinator(settings(), emptyPortfolio(), {
    operationLog: operations,
  })
  const result = coordinator.commitEvent({
    asOfDate: '2026-08-14',
    event: pendingBuyEvent('000001', 'pending-1'),
  })

  assert.equal(result.status, 'pending-confirmation')
  assert.equal(result.ok, false)
  assert.equal(result.holding?.units, 100)
  assert.equal(result.holding?.totalCostCents, 12000)
  assert.equal(
    portfolio.getPortfolio().events.some(({ id }) => id === 'pending-1'),
    true,
  )
  assert.equal(funds.getSettingsSnapshot().holdingsByCode['000001']?.units, 100)
  assert.equal(operations.filter((operation) => operation === 'funds:restore').length, 0)
})

test('keeps a calculation error as a domain result without compensation', () => {
  const calculationError = new Error('calculation failed')
  const operations: string[] = []
  const funds = createFundsFacade(settings(), false, false, { operationLog: operations })
  const portfolioStore = createPortfolioStore(emptyPortfolio(), () => {
    operations.push('portfolio:write')
  })
  const portfolio = {
    ...portfolioStore,
    calculate: (_input: Parameters<typeof portfolioStore.calculate>[0]) => {
      throw calculationError
    },
    getPortfolio() {
      operations.push('portfolio:snapshot')
      return portfolioStore.getPortfolio()
    },
  }
  const coordinator = createPortfolioCoordinator({
    funds,
    now: () => '2026-08-14T09:00:00.000Z',
    portfolio,
  })

  const result = coordinator.commitEvent({
    asOfDate: '2026-08-14',
    event: confirmedBuyEvent('000001', 'calculation-fails'),
  })

  assert.equal(result.status, 'ledger-error')
  assert.equal(result.retryable, true)
  assert.equal(result.partialPersistence, false)
  assert.equal(result.error, calculationError)
  assert.equal(operations.filter((operation) => operation === 'funds:restore').length, 0)
})

test('does not invent an initial event for a new fund first bought through the coordinator', () => {
  const { coordinator, funds, portfolio } = createCoordinator(settings({ holdingsByCode: {} }))
  const result = coordinator.commitEvent({
    asOfDate: '2026-08-14',
    event: confirmedBuyEvent('000002', 'buy-1'),
  })

  assert.equal(result.status, 'synced')
  assert.deepEqual(
    portfolio.getPortfolio().events.map(({ id }) => id),
    ['buy-1'],
  )
  assert.deepEqual(funds.getSettingsSnapshot().holdingsByCode['000002'], {
    code: '000002',
    dividendMode: 'cash',
    purchaseDate: '2026-08-14',
    totalCostCents: 1000,
    units: 10,
  })
})

test('keeps a zero projection and metadata after a full sell', () => {
  const { coordinator, funds } = createCoordinator(settings(), {
    events: [initialHoldingEvent('000001')],
    fundCodes: ['000001'],
  })

  const result = coordinator.commitEvent({
    asOfDate: '2026-08-14',
    event: fullSellEvent('000001', 'sell-all'),
  })

  assert.equal(result.status, 'synced')
  assert.deepEqual(funds.getSettingsSnapshot().holdingsByCode['000001'], {
    code: '000001',
    dividendMode: 'cash',
    purchaseDate: '2024-01-01',
    totalCostCents: 0,
    units: 0,
  })
  assert.equal(result.holding?.purchaseDate, '2024-01-01')
})

test('rolls back portfolio facts when projection persistence fails', () => {
  const { coordinator, portfolio } = createCoordinator(settings(), emptyPortfolio(), {
    failProjection: true,
  })

  const result = coordinator.commitHoldingCorrection({
    asOfDate: '2026-08-14',
    confirmedDate: '2026-08-14',
    eventId: 'correction-fails',
    fundCode: '000001',
    reason: '失败重试',
    targetUnits: 120,
    totalCostCents: 15000,
  })

  assert.equal(result.status, 'holding-sync-failed')
  assert.equal(result.retryable, true)
  assert.equal(result.error instanceof Error, true)
  assert.equal((result.error as Error).message, 'projection quota exceeded')
  assert.equal(result.partialPersistence, false)
  assert.deepEqual(portfolio.getPortfolio(), emptyPortfolio())
})

test('restores Portfolio before Funds after projection failure', () => {
  const operations: string[] = []
  const { coordinator } = createCoordinator(settings(), emptyPortfolio(), {
    failProjection: true,
    mutateProjectionBeforeFailure: true,
    operationLog: operations,
  })

  const result = coordinator.commitHoldingCorrection({
    asOfDate: '2026-08-14',
    confirmedDate: '2026-08-14',
    eventId: 'projection-route',
    fundCode: '000001',
    reason: '补偿顺序',
    targetUnits: 120,
    totalCostCents: 15000,
  })

  assert.equal(result.partialPersistence, false)
  const projectionFailure = operations.indexOf('funds:projection')
  const recovery = operations.slice(projectionFailure + 1)
  const fundsRestore = recovery.indexOf('funds:restore')
  assert.notEqual(projectionFailure, -1)
  assert.notEqual(fundsRestore, -1)
  assert.ok(recovery.slice(0, fundsRestore).includes('portfolio:write'))
  assert.equal(recovery.slice(0, fundsRestore).includes('funds:restore'), false)
})

test('continues Funds recovery after Portfolio recovery fails and keeps the old public result shape', () => {
  const operations: string[] = []
  const { coordinator } = createCoordinator(settings(), emptyPortfolio(), {
    failPortfolioWritesAfter: 3,
    failProjection: true,
    failSettingsRestore: true,
    mutateProjectionBeforeFailure: true,
    operationLog: operations,
  })

  const result = coordinator.commitHoldingCorrection({
    asOfDate: '2026-08-14',
    confirmedDate: '2026-08-14',
    eventId: 'multiple-recovery-failures',
    fundCode: '000001',
    reason: '多重恢复失败',
    targetUnits: 120,
    totalCostCents: 15000,
  })

  assert.equal(result.partialPersistence, true)
  assert.equal('failure' in result, false)
  assert.equal(operations.filter((operation) => operation === 'funds:restore').length, 1)
})

test('writes metadata in Funds first and restores Portfolio then Funds when ledger setup fails', () => {
  const operations: string[] = []
  const { coordinator, funds, portfolio } = createCoordinator(settings(), emptyPortfolio(), {
    failPortfolioWrites: true,
    operationLog: operations,
  })

  const result = coordinator.updateHoldingMetadata({
    code: '000001',
    dividendMode: 'reinvest',
    purchaseDate: '2025-01-01',
  })

  assert.equal(result.status, 'portfolio-persistence-failed')
  assert.equal(result.partialPersistence, false)
  const metadata = operations.indexOf('funds:metadata')
  const portfolioWrite = operations.indexOf('portfolio:write')
  const fundsRestore = operations.indexOf('funds:restore')
  assert.ok(metadata >= 0 && metadata < portfolioWrite)
  assert.ok(portfolioWrite < fundsRestore)
  assert.equal(funds.getSettingsSnapshot().holdingsByCode['000001']?.dividendMode, 'cash')
  assert.deepEqual(portfolio.getPortfolio(), emptyPortfolio())
})

test('rebuilding projections is idempotent and preserves a full-sell zero state', () => {
  const { coordinator, funds } = createCoordinator(settings(), {
    events: [initialHoldingEvent('000001'), fullSellEvent('000001', 'sell-all')],
    fundCodes: ['000001'],
  })

  const first = coordinator.rebuildHoldingProjections({ asOfDate: '2026-08-14' })
  const second = coordinator.rebuildHoldingProjections({ asOfDate: '2026-08-14' })

  assert.equal(first.status, 'synced')
  assert.equal(second.status, 'synced')
  assert.equal(funds.getSettingsSnapshot().holdingsByCode['000001']?.units, 0)
  assert.equal(funds.getSettingsSnapshot().holdingsByCode['000001']?.totalCostCents, 0)
})
