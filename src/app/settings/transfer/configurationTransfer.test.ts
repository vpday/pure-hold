import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPortfolioCoordinator,
  type FundsPortfolioFacade,
  type RebuildHoldingProjectionsResult,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { createCoordinationFailureFact } from '@/app/coordination/coordinationFailure.ts'
import type { FundHolding } from '@/domains/funds/models/fundHolding.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import { defaultIndexGroups } from '@/domains/indices/config/defaultIndexGroups.ts'
import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition.ts'
import type { Portfolio } from '@/domains/portfolio/models/index.ts'
import { createPortfolioStore } from '@/domains/portfolio/stores/index.ts'
import {
  createConfigurationTransferPackage,
  parseConfigurationTransfer,
  serializeConfigurationTransfer,
} from './configurationTransfer.ts'
import { createConfigurationTransferCoordinator } from './configurationTransferCoordinator.ts'
import { createPortfolioTransferAdapter } from './portfolioTransfer.ts'

const fundSettings: FundSettings = {
  funds: [{ code: '000001', name: '基金一' }],
  groups: [{ fundCodes: ['000001'], id: 'custom', name: '自定义' }],
  holdingOrder: ['000001'],
  holdingsByCode: {
    '000001': {
      code: '000001',
      costPrice: 1.2345,
      dividendMode: 'reinvest',
      purchaseDate: '2020-01-01',
      units: 2,
    },
  },
}

const portfolio: Portfolio = {
  events: [
    {
      auditedAt: '2026-08-14T09:00:00.000Z',
      confirmedDate: '2024-01-01',
      costAmount: { confidence: 'actual', source: 'migration', value: 12000 },
      createdAt: '2026-08-14T09:00:00.000Z',
      fundCode: '000001',
      id: 'initial-holding:000001',
      kind: 'initial-holding',
      settlementStatus: 'settled',
      source: 'initial-holding',
      units: { confidence: 'actual', source: 'migration', value: 100 },
      updatedAt: '2026-08-14T09:00:00.000Z',
    },
  ],
  fundCodes: ['000001'],
}

const exactFundSettings: FundSettings = {
  funds: [{ code: '000001', name: '基金一' }],
  groups: [{ fundCodes: ['000001'], id: 'custom', name: '自定义' }],
  holdingOrder: ['000001'],
  holdingsByCode: {
    '000001': {
      code: '000001',
      dividendMode: 'cash',
      purchaseDate: '2024-01-01',
      totalCostCents: 12000,
      units: 100,
    },
  },
}

function createRestoreHarness(
  initialSettings: FundSettings = exactFundSettings,
  initialPortfolio: Portfolio = { events: [], fundCodes: [] },
  options: {
    readonly failProjection?: boolean
    readonly failPortfolioWrites?: boolean
    readonly failSettingsOnCall?: number
  } = {},
) {
  let currentSettings = structuredClone(initialSettings)
  let settingsWrites = 0
  const funds: FundsPortfolioFacade = {
    deleteFund: () => ({}),
    getSettingsSnapshot: () => structuredClone(currentSettings),
    replaceHoldingProjection: (holding: FundHolding) => {
      if (options.failProjection) {
        return {
          error: new Error('projection quota exceeded'),
          ok: false,
          reason: 'persistence-failed' as const,
        }
      }
      currentSettings = {
        ...currentSettings,
        holdingOrder: currentSettings.holdingOrder.includes(holding.code)
          ? currentSettings.holdingOrder
          : [...currentSettings.holdingOrder, holding.code],
        holdingsByCode: { ...currentSettings.holdingsByCode, [holding.code]: holding },
      }
      return { ok: true as const }
    },
    replaceSettingsPersisted: (settings) => {
      settingsWrites += 1
      if (options.failSettingsOnCall === settingsWrites) {
        return {
          error: new Error('settings quota exceeded'),
          ok: false,
          reason: 'persistence-failed' as const,
        }
      }
      currentSettings = structuredClone(settings)
      return { ok: true as const }
    },
    updateHoldingMetadata: (input) => {
      const previous = currentSettings.holdingsByCode[input.code]
      currentSettings = {
        ...currentSettings,
        holdingOrder: previous
          ? currentSettings.holdingOrder
          : [...currentSettings.holdingOrder, input.code],
        holdingsByCode: {
          ...currentSettings.holdingsByCode,
          [input.code]: {
            code: input.code,
            dividendMode: input.dividendMode,
            purchaseDate: input.purchaseDate,
            totalCostCents: previous?.totalCostCents ?? 0,
            units: previous?.units ?? 0,
          },
        },
      }
      return { ok: true as const }
    },
  }
  const portfolioStore = createPortfolioStore(initialPortfolio, () => {
    if (options.failPortfolioWrites) throw new Error('portfolio quota exceeded')
  })
  const portfolioTransfer = createPortfolioTransferAdapter(portfolioStore)
  const portfolioCoordinator = createPortfolioCoordinator({
    funds,
    now: () => '2026-08-14T09:00:00.000Z',
    portfolio: portfolioStore,
  })
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => ({ groups, ok: true }),
    getFundSettings: funds.getSettingsSnapshot,
    getIndexGroups: () => [],
    getPortfolio: portfolioStore.getPortfolio,
    rebuildHoldingProjections: () =>
      portfolioCoordinator.rebuildHoldingProjections({ asOfDate: '2026-08-14' }),
    replaceFundSettings: funds.replaceSettingsPersisted,
    replacePortfolio: portfolioTransfer.replace,
  })

  return { coordinator, funds, portfolio: portfolioStore }
}

function pendingPortfolio(): Portfolio {
  return {
    events: [
      {
        auditedAt: '2026-08-14T09:00:00.000Z',
        createdAt: '2026-08-14T09:00:00.000Z',
        entryMode: 'pending',
        fundCode: '000001',
        id: 'pending-buy:000001',
        kind: 'buy',
        navDate: '2026-08-14',
        purchaseFee: { confidence: 'actual', source: 'manual', value: 0 },
        purchaseFeeRate: { confidence: 'actual', source: 'manual', value: 0 },
        settlementStatus: 'pending-settlement',
        source: 'manual',
        submittedAt: '2026-08-14 09:00',
        totalAmount: { confidence: 'actual', source: 'manual', value: 1000 },
        unitNav: { confidence: 'actual', source: 'manual', value: 1 },
        units: { confidence: 'actual', source: 'manual', value: 10 },
        updatedAt: '2026-08-14T09:00:00.000Z',
      },
    ],
    fundCodes: ['000001'],
  }
}

test('configuration transfer round trips both domains without refresh preferences', () => {
  const text = serializeConfigurationTransfer({
    fundSettings,
    indexGroups: defaultIndexGroups,
    portfolio,
  })
  assert.equal(text.includes('intervalSeconds'), false)
  assert.equal(text.includes('marketDataByCode'), false)

  const result = parseConfigurationTransfer(
    text,
    new Set(defaultIndexGroups.flatMap((group) => group.quoteCodes)),
  )
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.package.index?.groups, defaultIndexGroups)
    assert.deepEqual(result.package.funds, {
      ...fundSettings,
      holdingsByCode: {
        '000001': {
          code: '000001',
          dividendMode: 'reinvest',
          purchaseDate: '2020-01-01',
          totalCostCents: 247,
          units: 2,
        },
      },
    })
    assert.deepEqual(result.package.portfolio, portfolio)
    assert.deepEqual(result.warnings, [])
    assert.deepEqual(result.sectionErrors, [])
  }
})

test('configuration transfer keeps old packages without a portfolio section compatible', () => {
  const result = parseConfigurationTransfer(
    serializeConfigurationTransfer({ fundSettings, indexGroups: defaultIndexGroups }),
    new Set(defaultIndexGroups.flatMap((group) => group.quoteCodes)),
  )

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.package.portfolio, undefined)
})

test('configuration transfer preserves portfolio fund references without warnings', () => {
  const result = parseConfigurationTransfer(
    serializeConfigurationTransfer({ portfolio }),
    new Set(),
    new Set(['000002']),
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.package.portfolio, portfolio)
  assert.deepEqual(result.warnings, [])
})

test('configuration transfer rejects an import containing invalid sections without partial data', () => {
  const packageValue = createConfigurationTransferPackage({ indexGroups: defaultIndexGroups })
  const raw = JSON.stringify({
    ...packageValue,
    funds: {
      funds: [{ code: 'broken', name: '无效' }],
    },
    index: {
      groups: [{ id: 'custom', name: '自定义', quoteCodes: ['1.000001', 'unknown'] }],
    },
  })
  const result = parseConfigurationTransfer(raw, new Set(['1.000001']))
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /unknown-quote-code/)
})

test('configuration transfer coordinator rolls back an earlier section when a later write fails', () => {
  let indexGroups: readonly IndexGroupDefinition[] = defaultIndexGroups
  let writes = 0
  const coordinator = createConfigurationTransferCoordinator({
    getFundSettings: () => fundSettings,
    getIndexGroups: () => indexGroups,
    replaceFundSettings: () => ({ ok: false, reason: 'quota exceeded' }),
    commitIndexGroups: (groups) => {
      writes += 1
      indexGroups = groups
      return { groups, ok: true }
    },
  })
  const packageValue = createConfigurationTransferPackage({
    fundSettings,
    indexGroups: [{ id: 'new', name: '新分组', quoteCodes: [] }],
  })

  const result = coordinator.commitImport(packageValue, { funds: true, index: true })
  assert.deepEqual(result, {
    failure: createCoordinationFailureFact('restored'),
    ok: false,
    reason: '基金配置保存失败，已恢复原指数配置',
  })
  assert.deepEqual(indexGroups, defaultIndexGroups)
  assert.equal(writes, 2)
})

test('configuration transfer reports partial persistence when rollback fails', () => {
  let indexWrites = 0
  const rollbackError = new Error('rollback failed')
  const coordinator = createConfigurationTransferCoordinator({
    getFundSettings: () => fundSettings,
    getIndexGroups: () => defaultIndexGroups,
    replaceFundSettings: () => ({ ok: false, reason: 'quota exceeded' }),
    commitIndexGroups: (groups) => {
      indexWrites += 1
      return indexWrites === 1
        ? { groups, ok: true }
        : { error: rollbackError, ok: false, reason: 'persistence-failed' }
    },
  })
  const packageValue = createConfigurationTransferPackage({
    fundSettings,
    indexGroups: defaultIndexGroups,
  })

  assert.deepEqual(coordinator.commitImport(packageValue, { funds: true, index: true }), {
    ok: false,
    failure: createCoordinationFailureFact('partial', undefined, [rollbackError]),
    reason: '基金配置保存失败，指数配置可能已部分写入',
  })
})

test('configuration transfer overwrites portfolio conflicts by default', () => {
  let currentPortfolio = portfolio
  const portfolioStore = createPortfolioStore(portfolio, (candidate) => {
    currentPortfolio = candidate
  })
  const portfolioAdapter = createPortfolioTransferAdapter(portfolioStore)
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => ({ groups, ok: true }),
    getFundSettings: () => fundSettings,
    getIndexGroups: () => defaultIndexGroups,
    getPortfolio: () => currentPortfolio,
    rebuildHoldingProjections: () => ({
      portfolio: currentPortfolio,
      results: [],
      retryable: false,
      status: 'synced' as const,
    }),
    replaceFundSettings: () => ({ ok: true }),
    replacePortfolio: portfolioAdapter.replace,
  })
  const incoming = {
    ...portfolio,
    events: portfolio.events.map((event) => ({ ...event, auditedAt: '2026-08-15T09:00:00.000Z' })),
  }

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({ portfolio: incoming }),
    { funds: false, index: false, portfolio: true },
  )

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.rebuild?.status, 'synced')
  assert.deepEqual(currentPortfolio, incoming)
})

test('configuration transfer routes explicit portfolio replacement through the replacement seam', () => {
  let currentPortfolio = portfolio
  const portfolioStore = createPortfolioStore(portfolio, (candidate) => {
    currentPortfolio = candidate
  })
  const portfolioAdapter = createPortfolioTransferAdapter(portfolioStore)
  const replacement: Portfolio = { events: [], fundCodes: ['000001'] }
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => ({ groups, ok: true }),
    getFundSettings: () => fundSettings,
    getIndexGroups: () => defaultIndexGroups,
    getPortfolio: () => currentPortfolio,
    rebuildHoldingProjections: () => ({
      portfolio: currentPortfolio,
      results: [],
      retryable: false,
      status: 'synced' as const,
    }),
    replaceFundSettings: () => ({ ok: true }),
    replacePortfolio: portfolioAdapter.replace,
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({ portfolio: replacement }),
    { funds: false, index: false, portfolio: true },
  )

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.rebuild?.status, 'synced')
  assert.deepEqual(currentPortfolio, replacement)
})

test('configuration restore gives portfolio replay priority over imported holding facts', () => {
  const harness = createRestoreHarness()
  const importedSettings: FundSettings = {
    ...exactFundSettings,
    holdingsByCode: {
      '000001': {
        ...exactFundSettings.holdingsByCode['000001']!,
        dividendMode: 'reinvest',
        purchaseDate: '2020-01-01',
        totalCostCents: 700,
        units: 7,
      },
    },
  }

  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({ fundSettings: importedSettings, portfolio }),
    { funds: true, index: false, portfolio: true },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.rebuild?.status, 'synced')
  assert.deepEqual(harness.portfolio.getPortfolio(), portfolio)
  assert.deepEqual(harness.funds.getSettingsSnapshot().holdingsByCode['000001'], {
    code: '000001',
    dividendMode: 'reinvest',
    purchaseDate: '2020-01-01',
    totalCostCents: 12000,
    units: 100,
  })
})

test('configuration restore of FundSettings alone does not create an initial event', () => {
  const harness = createRestoreHarness()
  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({ fundSettings: exactFundSettings }),
    { funds: true, index: false, portfolio: false },
  )

  assert.deepEqual(result, { ok: true })
  assert.deepEqual(harness.portfolio.getPortfolio(), { events: [], fundCodes: [] })
  assert.equal(harness.funds.getSettingsSnapshot().holdingsByCode['000001']?.units, 100)
})

test('configuration restore of Portfolio alone rebuilds its holding projection', () => {
  const initialSettings: FundSettings = {
    ...exactFundSettings,
    holdingsByCode: {
      '000001': {
        ...exactFundSettings.holdingsByCode['000001']!,
        purchaseDate: '2020-01-01',
        totalCostCents: 500,
        units: 5,
      },
    },
  }
  const harness = createRestoreHarness(initialSettings)
  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({ portfolio }),
    { funds: false, index: false, portfolio: true },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.rebuild?.status, 'synced')
  assert.equal(harness.funds.getSettingsSnapshot().holdingsByCode['000001']?.units, 100)
  assert.equal(harness.funds.getSettingsSnapshot().holdingsByCode['000001']?.totalCostCents, 12000)
  assert.equal(
    harness.funds.getSettingsSnapshot().holdingsByCode['000001']?.purchaseDate,
    '2020-01-01',
  )
})

test('configuration restore keeps pending projection status and rolls back old state', () => {
  const initialPortfolio = portfolio
  const harness = createRestoreHarness(exactFundSettings, initialPortfolio)
  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: exactFundSettings,
      portfolio: pendingPortfolio(),
    }),
    { funds: true, index: false, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.persistence, 'restored')
  assert.equal(result.rebuild?.status, 'pending')
  assert.equal(result.rebuild?.results[0]?.status, 'pending-confirmation')
  assert.deepEqual(harness.portfolio.getPortfolio(), initialPortfolio)
  assert.deepEqual(harness.funds.getSettingsSnapshot(), exactFundSettings)
})

test('configuration restore isolates pending status for one fund without hiding another fund result', () => {
  const multiSettings: FundSettings = {
    ...exactFundSettings,
    funds: [...exactFundSettings.funds, { code: '000002', name: '基金二' }],
    holdingOrder: ['000001', '000002'],
    holdingsByCode: {
      ...exactFundSettings.holdingsByCode,
      '000002': {
        code: '000002',
        dividendMode: 'cash',
        purchaseDate: '2024-01-01',
        totalCostCents: 12000,
        units: 100,
      },
    },
  }
  const pending = pendingPortfolio()
  const multiPortfolio: Portfolio = {
    events: [
      portfolio.events[0]!,
      { ...pending.events[0]!, fundCode: '000002', id: 'pending-buy:000002' },
    ],
    fundCodes: ['000001', '000002'],
  }
  const harness = createRestoreHarness(multiSettings)
  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: multiSettings,
      portfolio: multiPortfolio,
    }),
    { funds: true, index: false, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.rebuild?.status, 'pending')
  assert.deepEqual(
    result.rebuild?.results.map(({ fundCode, status }) => ({ fundCode, status })),
    [
      { fundCode: '000001', status: 'synced' },
      { fundCode: '000002', status: 'pending-confirmation' },
    ],
  )
  assert.deepEqual(harness.portfolio.getPortfolio(), { events: [], fundCodes: [] })
  assert.deepEqual(harness.funds.getSettingsSnapshot(), multiSettings)
})

test('configuration restore rolls back projection failures', () => {
  const harness = createRestoreHarness(
    exactFundSettings,
    { events: [], fundCodes: [] },
    {
      failProjection: true,
    },
  )
  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({ fundSettings: exactFundSettings, portfolio }),
    { funds: true, index: false, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.persistence, 'restored')
  assert.equal(result.rebuild?.status, 'failed')
  assert.deepEqual(harness.portfolio.getPortfolio(), { events: [], fundCodes: [] })
  assert.deepEqual(harness.funds.getSettingsSnapshot(), exactFundSettings)
})

test('configuration restore leaves settings untouched when Portfolio persistence fails', () => {
  const harness = createRestoreHarness(
    exactFundSettings,
    { events: [], fundCodes: [] },
    {
      failPortfolioWrites: true,
    },
  )
  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({ fundSettings: exactFundSettings, portfolio }),
    { funds: true, index: false, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.persistence, 'unchanged')
  assert.equal(result.rebuild, undefined)
  assert.deepEqual(harness.portfolio.getPortfolio(), { events: [], fundCodes: [] })
  assert.deepEqual(harness.funds.getSettingsSnapshot(), exactFundSettings)
})

test('configuration restore reports partial persistence when compensation fails', () => {
  const harness = createRestoreHarness(
    exactFundSettings,
    { events: [], fundCodes: [] },
    {
      failProjection: true,
      failSettingsOnCall: 2,
    },
  )
  const importedSettings: FundSettings = {
    ...exactFundSettings,
    holdingsByCode: {
      '000001': {
        ...exactFundSettings.holdingsByCode['000001']!,
        totalCostCents: 700,
        units: 7,
      },
    },
  }
  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({ fundSettings: importedSettings, portfolio }),
    { funds: true, index: false, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.persistence, 'partial')
  assert.deepEqual(harness.portfolio.getPortfolio(), { events: [], fundCodes: [] })
  assert.equal(harness.funds.getSettingsSnapshot().holdingsByCode['000001']?.units, 7)
})

test('repeating the same configuration restore does not duplicate portfolio events', () => {
  const harness = createRestoreHarness()
  const packageValue = createConfigurationTransferPackage({
    fundSettings: exactFundSettings,
    portfolio,
  })

  const first = harness.coordinator.commitImport(packageValue, {
    funds: true,
    index: false,
    portfolio: true,
  })
  const second = harness.coordinator.commitImport(packageValue, {
    funds: true,
    index: false,
    portfolio: true,
  })

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(harness.portfolio.getPortfolio().events.length, 1)
  assert.equal(harness.funds.getSettingsSnapshot().holdingsByCode['000001']?.totalCostCents, 12000)
})

test('configuration restore rejects a portfolio without fund metadata', () => {
  const harness = createRestoreHarness()
  const orphanedPortfolio: Portfolio = { events: [], fundCodes: ['000002'] }
  const result = harness.coordinator.commitImport(
    createConfigurationTransferPackage({ portfolio: orphanedPortfolio }),
    { funds: false, index: false, portfolio: true },
  )

  assert.deepEqual(result, {
    ok: false,
    reason: '投资账本缺少基金元数据：000002',
  })
  assert.deepEqual(harness.portfolio.getPortfolio(), { events: [], fundCodes: [] })
})

test('configuration transfer rejects incompatible outer packages', () => {
  assert.deepEqual(parseConfigurationTransfer(JSON.stringify({ version: 0 }), new Set()), {
    message: '配置文件版本或格式不兼容',
    ok: false,
  })
})

test('configuration restore captures every selected snapshot before ordered writes', () => {
  const events: string[] = []
  let indexCalls = 0
  let portfolioCalls = 0
  let fundsCalls = 0
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => {
      events.push(indexCalls++ === 0 ? 'write:index' : 'restore:index')
      return { groups, ok: true }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => {
      events.push('capture:index')
      return defaultIndexGroups
    },
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => {
      events.push('rebuild')
      return {
        portfolio,
        results: [],
        retryable: false,
        status: 'synced' as const,
      }
    },
    replaceFundSettings: () => {
      events.push(fundsCalls++ === 0 ? 'write:funds' : 'restore:funds')
      return { ok: true }
    },
    replacePortfolio: () => {
      events.push(portfolioCalls++ === 0 ? 'write:portfolio' : 'restore:portfolio')
      return { ok: true }
    },
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: exactFundSettings,
      indexGroups: defaultIndexGroups,
      portfolio,
    }),
    { funds: true, index: true, portfolio: true },
  )

  assert.equal(result.ok, true)
  assert.deepEqual(events, [
    'capture:index',
    'capture:portfolio',
    'capture:funds',
    'write:index',
    'write:portfolio',
    'write:funds',
    'rebuild',
  ])
})

test('configuration restore stops after an index write failure without compensation', () => {
  const events: string[] = []
  const indexError = new Error('index quota exceeded')
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: () => {
      events.push('write:index')
      return { error: indexError, ok: false, reason: 'persistence-failed' }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => {
      events.push('capture:index')
      return defaultIndexGroups
    },
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => {
      events.push('rebuild')
      return {
        portfolio,
        results: [],
        retryable: false,
        status: 'synced' as const,
      }
    },
    replaceFundSettings: () => {
      events.push('write:funds')
      return { ok: true }
    },
    replacePortfolio: () => {
      events.push('write:portfolio')
      return { ok: true }
    },
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: exactFundSettings,
      indexGroups: defaultIndexGroups,
      portfolio,
    }),
    { funds: true, index: true, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.primaryError, indexError)
  assert.equal(result.failure?.persistence, 'unchanged')
  assert.equal(result.reason, '指数配置保存失败')
  assert.deepEqual(events, ['capture:index', 'capture:portfolio', 'capture:funds', 'write:index'])
})

test('configuration restore only restores the earlier index after an internally recovered portfolio failure', () => {
  const events: string[] = []
  let indexCalls = 0
  let portfolioCalls = 0
  const portfolioError = new Error('portfolio write failed')
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => {
      events.push(indexCalls++ === 0 ? 'write:index' : 'restore:index')
      return { groups, ok: true }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => {
      events.push('capture:index')
      return defaultIndexGroups
    },
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => {
      events.push('rebuild')
      return {
        portfolio,
        results: [],
        retryable: false,
        status: 'synced' as const,
      }
    },
    replaceFundSettings: () => {
      events.push('write:funds')
      return { ok: true }
    },
    replacePortfolio: () => {
      events.push(portfolioCalls++ === 0 ? 'write:portfolio' : 'restore:portfolio')
      return portfolioCalls === 1
        ? {
            failure: createCoordinationFailureFact('restored', portfolioError),
            ok: false,
            reason: 'persistence-failed',
          }
        : { ok: true }
    },
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: exactFundSettings,
      indexGroups: defaultIndexGroups,
      portfolio,
    }),
    { funds: true, index: true, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.primaryError, portfolioError)
  assert.equal(result.failure?.persistence, 'restored')
  assert.equal(result.reason, '投资账本保存失败')
  assert.deepEqual(events, [
    'capture:index',
    'capture:portfolio',
    'capture:funds',
    'write:index',
    'write:portfolio',
    'restore:index',
  ])
})

test('configuration restore compensates a partial portfolio failure before the earlier index', () => {
  const events: string[] = []
  let indexCalls = 0
  let portfolioCalls = 0
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => {
      events.push(indexCalls++ === 0 ? 'write:index' : 'restore:index')
      return { groups, ok: true }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => {
      events.push('capture:index')
      return defaultIndexGroups
    },
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => ({
      portfolio,
      results: [],
      retryable: false,
      status: 'synced' as const,
    }),
    replaceFundSettings: () => ({ ok: true }),
    replacePortfolio: () => {
      events.push(portfolioCalls++ === 0 ? 'write:portfolio' : 'restore:portfolio')
      return portfolioCalls === 1
        ? {
            failure: createCoordinationFailureFact('partial', new Error('portfolio partial')),
            ok: false,
            reason: 'persistence-failed',
          }
        : { ok: true }
    },
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: exactFundSettings,
      indexGroups: defaultIndexGroups,
      portfolio,
    }),
    { funds: true, index: true, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.persistence, 'restored')
  assert.deepEqual(events, [
    'capture:index',
    'capture:portfolio',
    'capture:funds',
    'write:index',
    'write:portfolio',
    'restore:portfolio',
    'restore:index',
  ])
})

test('configuration restore compensates a normal funds failure with portfolio then index', () => {
  const events: string[] = []
  let indexCalls = 0
  let portfolioCalls = 0
  let fundsCalls = 0
  const fundsError = new Error('fund settings write failed')
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => {
      events.push(indexCalls++ === 0 ? 'write:index' : 'restore:index')
      return { groups, ok: true }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => {
      events.push('capture:index')
      return defaultIndexGroups
    },
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => ({
      portfolio,
      results: [],
      retryable: false,
      status: 'synced' as const,
    }),
    replaceFundSettings: () => {
      events.push(fundsCalls++ === 0 ? 'write:funds' : 'restore:funds')
      return fundsCalls === 1
        ? {
            failure: createCoordinationFailureFact('unchanged', fundsError),
            ok: false,
            reason: 'persistence-failed',
          }
        : { ok: true }
    },
    replacePortfolio: () => {
      events.push(portfolioCalls++ === 0 ? 'write:portfolio' : 'restore:portfolio')
      return { ok: true }
    },
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: exactFundSettings,
      indexGroups: defaultIndexGroups,
      portfolio,
    }),
    { funds: true, index: true, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.primaryError, fundsError)
  assert.equal(result.failure?.persistence, 'restored')
  assert.equal(result.reason, '基金配置保存失败，已恢复原指数配置')
  assert.deepEqual(events, [
    'capture:index',
    'capture:portfolio',
    'capture:funds',
    'write:index',
    'write:portfolio',
    'write:funds',
    'restore:portfolio',
    'restore:index',
  ])
})

test('configuration restore compensates a partial funds failure with funds then portfolio then index', () => {
  const events: string[] = []
  let indexCalls = 0
  let portfolioCalls = 0
  let fundsCalls = 0
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => {
      events.push(indexCalls++ === 0 ? 'write:index' : 'restore:index')
      return { groups, ok: true }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => {
      events.push('capture:index')
      return defaultIndexGroups
    },
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => ({
      portfolio,
      results: [],
      retryable: false,
      status: 'synced' as const,
    }),
    replaceFundSettings: () => {
      events.push(fundsCalls++ === 0 ? 'write:funds' : 'restore:funds')
      return fundsCalls === 1
        ? {
            failure: createCoordinationFailureFact('partial', new Error('fund settings partial')),
            ok: false,
            reason: 'persistence-failed',
          }
        : { ok: true }
    },
    replacePortfolio: () => {
      events.push(portfolioCalls++ === 0 ? 'write:portfolio' : 'restore:portfolio')
      return { ok: true }
    },
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: exactFundSettings,
      indexGroups: defaultIndexGroups,
      portfolio,
    }),
    { funds: true, index: true, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.persistence, 'restored')
  assert.deepEqual(events, [
    'capture:index',
    'capture:portfolio',
    'capture:funds',
    'write:index',
    'write:portfolio',
    'write:funds',
    'restore:funds',
    'restore:portfolio',
    'restore:index',
  ])
})

function runRebuildFailureScenario(
  rebuildHoldingProjections: () => RebuildHoldingProjectionsResult,
) {
  const events: string[] = []
  let indexCalls = 0
  let portfolioCalls = 0
  let fundsCalls = 0
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => {
      events.push(indexCalls++ === 0 ? 'write:index' : 'restore:index')
      return { groups, ok: true }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => {
      events.push('capture:index')
      return defaultIndexGroups
    },
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => {
      events.push('rebuild')
      return rebuildHoldingProjections()
    },
    replaceFundSettings: () => {
      events.push(fundsCalls++ === 0 ? 'write:funds' : 'restore:funds')
      return { ok: true }
    },
    replacePortfolio: () => {
      events.push(portfolioCalls++ === 0 ? 'write:portfolio' : 'restore:portfolio')
      return { ok: true }
    },
  })

  return {
    events,
    result: coordinator.commitImport(
      createConfigurationTransferPackage({
        fundSettings: exactFundSettings,
        indexGroups: defaultIndexGroups,
        portfolio,
      }),
      { funds: true, index: true, portfolio: true },
    ),
  }
}

test('configuration restore uses portfolio then funds then index for pending, failed, and thrown rebuilds', () => {
  const pending = runRebuildFailureScenario(() => ({
    portfolio,
    results: [],
    retryable: true,
    status: 'pending',
  }))
  assert.equal(pending.result.ok, false)
  if (!pending.result.ok) {
    assert.equal(pending.result.rebuild?.status, 'pending')
    assert.equal(pending.result.failure?.persistence, 'restored')
    assert.equal(pending.result.reason, '投资账本恢复后持仓信息仍待确认或精确数据')
  }
  assert.deepEqual(pending.events.slice(-3), [
    'restore:portfolio',
    'restore:funds',
    'restore:index',
  ])

  const failed = runRebuildFailureScenario(() => ({
    portfolio,
    results: [],
    retryable: true,
    status: 'failed',
  }))
  assert.equal(failed.result.ok, false)
  if (!failed.result.ok) {
    assert.equal(failed.result.rebuild?.status, 'failed')
    assert.equal(failed.result.failure?.persistence, 'restored')
    assert.equal(failed.result.reason, '投资账本恢复后持仓信息重建失败')
  }
  assert.deepEqual(failed.events.slice(-3), ['restore:portfolio', 'restore:funds', 'restore:index'])

  const rebuildError = new Error('rebuild threw')
  const thrown = runRebuildFailureScenario(() => {
    throw rebuildError
  })
  assert.equal(thrown.result.ok, false)
  if (!thrown.result.ok) {
    assert.equal(thrown.result.failure?.primaryError, rebuildError)
    assert.equal(thrown.result.rebuild, undefined)
    assert.equal(thrown.result.failure?.persistence, 'restored')
  }
  assert.deepEqual(thrown.events.slice(-3), ['restore:portfolio', 'restore:funds', 'restore:index'])
})

test('configuration restore continues after one recovery failure and reports partial persistence', () => {
  const events: string[] = []
  let indexCalls = 0
  let portfolioCalls = 0
  let fundsCalls = 0
  const rebuildError = new Error('rebuild threw')
  const fundsRestoreError = new Error('fund restore failed')
  const indexRestoreError = new Error('index restore failed')
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => {
      events.push(indexCalls++ === 0 ? 'write:index' : 'restore:index')
      return indexCalls === 2
        ? { error: indexRestoreError, ok: false, reason: 'persistence-failed' }
        : { groups, ok: true }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => {
      events.push('capture:index')
      return defaultIndexGroups
    },
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => {
      events.push('rebuild')
      throw rebuildError
    },
    replaceFundSettings: () => {
      events.push(fundsCalls++ === 0 ? 'write:funds' : 'restore:funds')
      return fundsCalls === 2
        ? { error: fundsRestoreError, ok: false, reason: 'persistence-failed' }
        : { ok: true }
    },
    replacePortfolio: () => {
      events.push(portfolioCalls++ === 0 ? 'write:portfolio' : 'restore:portfolio')
      return { ok: true }
    },
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({
      fundSettings: exactFundSettings,
      indexGroups: defaultIndexGroups,
      portfolio,
    }),
    { funds: true, index: true, portfolio: true },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.primaryError, rebuildError)
  assert.equal(result.failure?.persistence, 'partial')
  assert.equal(result.failure?.recoveryErrors.length, 2)
  assert.deepEqual(events.slice(-3), ['restore:portfolio', 'restore:funds', 'restore:index'])
})

test('configuration restore of Portfolio alone captures and restores the Funds projection', () => {
  const events: string[] = []
  let fundReads = 0
  let portfolioCalls = 0
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: () => {
      events.push('unexpected:index')
      return { groups: defaultIndexGroups, ok: true }
    },
    getFundSettings: () => {
      events.push(fundReads++ === 0 ? 'validate:funds' : 'capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => defaultIndexGroups,
    getPortfolio: () => {
      events.push('capture:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => ({
      portfolio,
      results: [],
      retryable: true,
      status: 'failed' as const,
    }),
    replaceFundSettings: () => {
      events.push('restore:funds')
      return { ok: true }
    },
    replacePortfolio: () => {
      events.push(portfolioCalls++ === 0 ? 'write:portfolio' : 'restore:portfolio')
      return { ok: true }
    },
  })

  const result = coordinator.commitImport(createConfigurationTransferPackage({ portfolio }), {
    funds: false,
    index: false,
    portfolio: true,
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.failure?.persistence, 'restored')
  assert.deepEqual(events, [
    'validate:funds',
    'capture:portfolio',
    'capture:funds',
    'write:portfolio',
    'restore:portfolio',
    'restore:funds',
  ])
})

test('configuration restore of FundSettings alone never runs a rebuild', () => {
  const events: string[] = []
  let rebuildCalls = 0
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: () => {
      events.push('unexpected:index')
      return { groups: defaultIndexGroups, ok: true }
    },
    getFundSettings: () => {
      events.push('capture:funds')
      return exactFundSettings
    },
    getIndexGroups: () => defaultIndexGroups,
    getPortfolio: () => {
      events.push('unexpected:portfolio')
      return portfolio
    },
    rebuildHoldingProjections: () => {
      rebuildCalls += 1
      throw new Error('rebuild must not run')
    },
    replaceFundSettings: () => {
      events.push('write:funds')
      return { ok: true }
    },
    replacePortfolio: () => {
      events.push('unexpected:portfolio-write')
      return { ok: true }
    },
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({ fundSettings: exactFundSettings }),
    { funds: true, index: false, portfolio: false },
  )

  assert.deepEqual(result, { ok: true })
  assert.equal(rebuildCalls, 0)
  assert.deepEqual(events, ['capture:funds', 'write:funds'])
})
