import assert from 'node:assert/strict'
import test from 'node:test'

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

test('loadIndexGroups removes quote codes that are no longer defined', () => {
  withStorage((storage) => {
    const groups = [{ id: 'custom', name: '自定义', quoteCodes: ['1.000001', 'missing'] }]
    storage.setItem(
      indexGroupsStorageKey,
      JSON.stringify({ groups, version: INDEX_SETTINGS_SCHEMA_VERSION }),
    )

    assert.deepEqual(loadIndexGroups(), [
      { id: 'custom', name: '自定义', quoteCodes: ['1.000001'] },
    ])
    assert.deepEqual(readStoredGroups(storage), [
      { id: 'custom', name: '自定义', quoteCodes: ['1.000001'] },
    ])
  })
})

test('saveIndexGroups validates data and surfaces storage failures', () => {
  withStorage(() => {
    assert.throws(
      () => saveIndexGroups([{ id: 'invalid', name: '无效', quoteCodes: [1] }] as never),
      /invalid shape/,
    )
  })

  withStorage(() => {
    assert.throws(() => saveIndexGroups(defaultIndexGroups), /quota exceeded/)
  }, new ThrowingStorage())
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
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

  try {
    callback(storage)
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'localStorage', descriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }
}

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return this.keys()[index] ?? null
  }

  keys(): string[] {
    return [...this.values.keys()]
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class ThrowingStorage extends MemoryStorage {
  override setItem(): void {
    throw new Error('quota exceeded')
  }
}
