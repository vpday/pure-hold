import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import { defaultIndexGroups } from '@/domains/indices/config/defaultIndexGroups.ts'
import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition.ts'
import {
  createConfigurationTransferPackage,
  parseConfigurationTransfer,
  serializeConfigurationTransfer,
} from './configurationTransfer.ts'
import { createConfigurationTransferCoordinator } from './configurationTransferCoordinator.ts'

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

test('configuration transfer round trips both domains without refresh preferences', () => {
  const text = serializeConfigurationTransfer({
    fundSettings,
    indexGroups: defaultIndexGroups,
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
    assert.deepEqual(result.warnings, [])
    assert.deepEqual(result.sectionErrors, [])
  }
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

test('configuration transfer rejects incompatible outer packages', () => {
  assert.deepEqual(parseConfigurationTransfer(JSON.stringify({ version: 0 }), new Set()), {
    message: '配置文件版本或格式不兼容',
    ok: false,
  })
})
