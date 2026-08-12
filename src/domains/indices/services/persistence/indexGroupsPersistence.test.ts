import assert from 'node:assert/strict'
import test from 'node:test'

import {
  installLocalStorage,
  installLocalStorageGetter,
  MemoryStorage,
} from '@/shared/testing/browserStorageTestSupport.ts'
import { defaultIndexGroups } from '../../config/defaultIndexGroups.ts'
import type { IndexGroupDefinition } from '../../models/indexGroupDefinition.ts'
import {
  INDEX_SETTINGS_SCHEMA_VERSION,
  corruptIndexGroupsStorageKeyPrefix,
  indexGroupsStorageKey,
} from './indexSettingsSchemaVersion.ts'
import { loadIndexGroups } from './loadIndexGroups.ts'
import { saveIndexGroups } from './saveIndexGroups.ts'

test('loadIndexGroups persists and returns the default groups on first use', () => {
  withStorage((storage) => {
    assert.deepEqual(loadIndexGroups(), defaultIndexGroups)
    assert.deepEqual(readStoredGroups(storage), defaultIndexGroups)
  })
})

test('loadIndexGroups returns defaults when storage access or reads fail', () => {
  const restoreGetter = installLocalStorageGetter(() => {
    throw new Error('storage unavailable')
  })
  try {
    assert.deepEqual(loadIndexGroups(), defaultIndexGroups)
  } finally {
    restoreGetter()
  }

  const storage = new MemoryStorage()
  storage.readError = new Error('read failed')
  withStorage(() => assert.deepEqual(loadIndexGroups(), defaultIndexGroups), storage)
})

test('loadIndexGroups restores defaults and backs up malformed data', () => {
  withStorage((storage) => {
    storage.setItem(indexGroupsStorageKey, '{not valid json')

    const warn = console.warn
    console.warn = () => {}
    try {
      assert.deepEqual(loadIndexGroups(), defaultIndexGroups)
    } finally {
      console.warn = warn
    }

    assert.deepEqual(readStoredGroups(storage), defaultIndexGroups)
    assert.equal(
      storage.keys().some((key) => key.startsWith(corruptIndexGroupsStorageKeyPrefix)),
      true,
    )
  })
})

test('loadIndexGroups restores defaults for an incompatible schema version', () => {
  withStorage((storage) => {
    storage.setItem(indexGroupsStorageKey, JSON.stringify({ groups: [], version: 0 }))

    const warn = console.warn
    console.warn = () => {}
    try {
      assert.deepEqual(loadIndexGroups(), defaultIndexGroups)
    } finally {
      console.warn = warn
    }

    assert.deepEqual(readStoredGroups(storage), defaultIndexGroups)
  })
})

test('loadIndexGroups backs up and resets groups containing unknown quote codes', () => {
  withStorage((storage) => {
    const groups = [{ id: 'custom', name: '自定义', quoteCodes: ['1.000001', 'missing'] }]
    storage.setItem(
      indexGroupsStorageKey,
      JSON.stringify({ groups, version: INDEX_SETTINGS_SCHEMA_VERSION }),
    )

    const warn = console.warn
    console.warn = () => {}
    try {
      assert.deepEqual(loadIndexGroups(), defaultIndexGroups)
    } finally {
      console.warn = warn
    }

    assert.deepEqual(readStoredGroups(storage), defaultIndexGroups)
    assert.equal(
      storage.keys().some((key) => key.startsWith(corruptIndexGroupsStorageKeyPrefix)),
      true,
    )
  })
})

test('saveIndexGroups validates data and surfaces storage failures', () => {
  withStorage(() => {
    assert.throws(
      () => saveIndexGroups([{ id: 'invalid', name: '无效', quoteCodes: [1] }] as never),
      /invalid-quote-code/,
    )

    assert.throws(() => saveIndexGroups([]), /empty-groups/)
  })

  const storage = new MemoryStorage()
  storage.writeError = new Error('quota exceeded')
  withStorage(() => {
    assert.throws(() => saveIndexGroups(defaultIndexGroups), /quota exceeded/)
  }, storage)
})

function readStoredGroups(storage: MemoryStorage): readonly IndexGroupDefinition[] {
  const saved = storage.getItem(indexGroupsStorageKey)
  if (saved === null) {
    throw new Error('Expected index groups to be stored')
  }
  const parsed: unknown = JSON.parse(saved)
  assert.equal(typeof parsed, 'object')
  assert.notEqual(parsed, null)
  assert.equal(Array.isArray((parsed as { groups?: unknown }).groups), true)
  return (parsed as { groups: readonly IndexGroupDefinition[] }).groups
}

function withStorage(
  callback: (storage: MemoryStorage) => void,
  storage: MemoryStorage = new MemoryStorage(),
): void {
  const restore = installLocalStorage(storage)

  try {
    callback(storage)
  } finally {
    restore()
  }
}
