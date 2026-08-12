import assert from 'node:assert/strict'
import test from 'node:test'

import { createIndexSettingsCommandModule } from './createIndexSettingsCommandModule.ts'

test('index settings command validates before persistence and apply', () => {
  const calls: string[] = []
  const command = createIndexSettingsCommandModule({
    apply: () => calls.push('apply'),
    knownQuoteCodes: new Set(['index-1']),
    persist: () => calls.push('persist'),
  })

  const result = command.commitReplace([{ id: 'group', name: '分组', quoteCodes: ['missing'] }])
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'invalid-groups')
  assert.deepEqual(calls, [])
})

test('index settings command does not apply after persistence failure', () => {
  const error = new Error('storage failed')
  const calls: string[] = []
  const command = createIndexSettingsCommandModule({
    apply: () => calls.push('apply'),
    knownQuoteCodes: new Set(['index-1']),
    persist: () => {
      calls.push('persist')
      throw error
    },
  })

  assert.deepEqual(
    command.commitReplace([{ id: 'group', name: '分组', quoteCodes: ['index-1'] }]),
    { error, ok: false, reason: 'persistence-failed' },
  )
  assert.deepEqual(calls, ['persist'])
})

test('index settings command persists then applies one detached candidate', () => {
  const calls: string[] = []
  const observedGroups: unknown[] = []
  const command = createIndexSettingsCommandModule({
    apply: (groups) => {
      calls.push('apply')
      observedGroups.push(groups)
    },
    knownQuoteCodes: new Set(['index-1']),
    persist: (groups) => {
      calls.push('persist')
      observedGroups.push(groups)
    },
  })
  const groups = [{ id: 'group', name: '分组', quoteCodes: ['index-1'] }]

  const result = command.commitReplace(groups)

  assert.equal(result.ok, true)
  assert.deepEqual(calls, ['persist', 'apply'])
  assert.equal(observedGroups[0], observedGroups[1])
  assert.notEqual(observedGroups[0], groups)
})
