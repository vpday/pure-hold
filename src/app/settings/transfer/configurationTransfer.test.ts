import assert from 'node:assert/strict'
import test from 'node:test'

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
  installments: [],
  plans: [],
}

test('configuration transfer round trips both domains without refresh preferences', () => {
  const text = serializeConfigurationTransfer({
    fundSettings,
    indexGroups: defaultIndexGroups,
    portfolio,
  })
  assert.equal(text.includes('intervalSeconds'), false)
  assert.equal(text.includes('snapshotsByCode'), false)

  const result = parseConfigurationTransfer(
    text,
    new Set(defaultIndexGroups.flatMap((group) => group.quoteCodes)),
  )
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.package.index?.groups, defaultIndexGroups)
    assert.deepEqual(result.package.funds, fundSettings)
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

test('configuration transfer preserves orphan fund references and reports them as warnings', () => {
  const result = parseConfigurationTransfer(
    serializeConfigurationTransfer({ portfolio }),
    new Set(),
    new Set(['000002']),
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.package.portfolio, portfolio)
  assert.deepEqual(result.warnings, [
    {
      message: '投资账本包含未添加基金 000001 的孤立记录，恢复基金后会按代码重新关联',
      section: 'portfolio',
    },
  ])
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
    ok: false,
    partialPersistence: false,
    reason: '基金配置保存失败，已恢复原指数配置',
  })
  assert.deepEqual(indexGroups, defaultIndexGroups)
  assert.equal(writes, 2)
})

test('configuration transfer reports partial persistence when rollback fails', () => {
  let indexWrites = 0
  const coordinator = createConfigurationTransferCoordinator({
    getFundSettings: () => fundSettings,
    getIndexGroups: () => defaultIndexGroups,
    replaceFundSettings: () => ({ ok: false, reason: 'quota exceeded' }),
    commitIndexGroups: (groups) => {
      indexWrites += 1
      return indexWrites === 1
        ? { groups, ok: true }
        : { error: new Error('rollback failed'), ok: false, reason: 'persistence-failed' }
    },
  })
  const packageValue = createConfigurationTransferPackage({
    fundSettings,
    indexGroups: defaultIndexGroups,
  })

  assert.deepEqual(coordinator.commitImport(packageValue, { funds: true, index: true }), {
    ok: false,
    partialPersistence: true,
    reason: '基金配置保存失败，指数配置可能已部分写入',
  })
})

test('configuration transfer pauses portfolio conflicts with stable IDs', () => {
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
    mergePortfolio: portfolioAdapter.merge,
    replaceFundSettings: () => ({ ok: true }),
    replacePortfolio: portfolioAdapter.replace,
  })
  const incoming = {
    ...portfolio,
    events: portfolio.events.map((event) => ({ ...event, auditedAt: '2026-08-15T09:00:00.000Z' })),
  }

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({ portfolio: incoming }),
    { funds: false, index: false, portfolio: true, portfolioMode: 'merge' },
  )

  assert.deepEqual(result, {
    conflicts: [{ collection: 'events', id: 'initial-holding:000001' }],
    ok: false,
    partialPersistence: false,
    reason: '投资账本存在稳定 ID 冲突，请选择合并或显式替换',
  })
  assert.deepEqual(currentPortfolio, portfolio)
})

test('configuration transfer routes explicit portfolio replacement through the replacement seam', () => {
  let currentPortfolio = portfolio
  const portfolioStore = createPortfolioStore(portfolio, (candidate) => {
    currentPortfolio = candidate
  })
  const portfolioAdapter = createPortfolioTransferAdapter(portfolioStore)
  const replacement: Portfolio = { events: [], fundCodes: ['000002'], installments: [], plans: [] }
  const coordinator = createConfigurationTransferCoordinator({
    commitIndexGroups: (groups) => ({ groups, ok: true }),
    getFundSettings: () => fundSettings,
    getIndexGroups: () => defaultIndexGroups,
    getPortfolio: () => currentPortfolio,
    mergePortfolio: portfolioAdapter.merge,
    replaceFundSettings: () => ({ ok: true }),
    replacePortfolio: portfolioAdapter.replace,
  })

  const result = coordinator.commitImport(
    createConfigurationTransferPackage({ portfolio: replacement }),
    { funds: false, index: false, portfolio: true, portfolioMode: 'replace' },
  )

  assert.deepEqual(result, { ok: true })
  assert.deepEqual(currentPortfolio, replacement)
})

test('configuration transfer rejects incompatible outer packages', () => {
  assert.deepEqual(parseConfigurationTransfer(JSON.stringify({ version: 0 }), new Set()), {
    message: '配置文件版本或格式不兼容',
    ok: false,
  })
})
