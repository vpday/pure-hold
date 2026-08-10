import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundSettings } from '../models/fundSettings.ts'
import {
  createFundSettingsCommandModule,
  type FundSettingsWriter,
} from './createFundSettingsCommandModule.ts'

test('commits settings atomically and returns member effects', () => {
  const writes: FundSettings[] = []
  let failWrites = false
  const module = createFundSettingsCommandModule(createSettings(), (settings) => {
    if (failWrites) throw new Error('quota exceeded')
    writes.push(settings)
  })

  const added = module.commit({
    additions: [{ code: '000001', name: ' 新基金 ' }],
    kind: 'add-funds',
  })
  assert.equal(added.ok, true)
  if (added.ok) {
    assert.deepEqual(added.effect, {
      funds: [{ code: '000001', name: '新基金' }],
      kind: 'funds-added',
    })
    assert.deepEqual(added.settings.funds, [
      { code: '161726', name: '旧名称' },
      { code: '000001', name: '新基金' },
    ])
  }

  failWrites = true
  const failed = module.commit({ code: '000001', kind: 'delete-fund' })
  assert.deepEqual(failed, { ok: false, reason: 'persistence-failed' })
  assert.equal(
    module.getSettings().funds.some(({ code }) => code === '000001'),
    true,
  )
  assert.equal(writes.length, 1)
})

test('retries an observed name against the last persisted baseline', () => {
  const writes: FundSettings[] = []
  let failWrites = true
  const writer: FundSettingsWriter = (settings) => {
    if (failWrites) throw new Error('quota exceeded')
    writes.push(settings)
  }
  const module = createFundSettingsCommandModule(createSettings(), writer)

  assert.deepEqual(module.syncObservedNames({ '161726': '新名称' }), {
    ok: false,
    reason: 'persistence-failed',
  })
  assert.equal(module.getSettings().funds[0]?.name, '新名称')

  failWrites = false
  assert.deepEqual(module.syncObservedNames({ '161726': '新名称' }), { ok: true })
  assert.equal(writes.length, 1)
  assert.equal(writes[0]?.funds[0]?.name, '新名称')
  assert.deepEqual(module.syncObservedNames({ '161726': '新名称' }), { ok: true })
  assert.equal(writes.length, 1)
})

test('later settings commands keep an observed name after its first save fails', () => {
  let failWrites = true
  const writes: FundSettings[] = []
  const module = createFundSettingsCommandModule(createSettings(), (settings) => {
    if (failWrites) throw new Error('quota exceeded')
    writes.push(settings)
  })

  assert.equal(module.syncObservedNames({ '161726': '行情名称' }).ok, false)
  failWrites = false
  assert.deepEqual(module.commit({ groups: [], kind: 'replace-groups' }), {
    effect: undefined,
    ok: true,
    settings: {
      funds: [{ code: '161726', name: '行情名称' }],
      groups: [],
      holdingOrder: [],
      holdingsByCode: {},
    },
  })
  assert.equal(writes[0]?.funds[0]?.name, '行情名称')
})

function createSettings(): FundSettings {
  return {
    funds: [{ code: '161726', name: '旧名称' }],
    groups: [],
    holdingOrder: [],
    holdingsByCode: {},
  }
}
