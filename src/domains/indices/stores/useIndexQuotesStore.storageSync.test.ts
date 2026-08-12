import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { MemoryStorage, installLocalStorage } from '@/shared/testing/browserStorageTestSupport.ts'
import { defaultIndexGroups } from '../config/defaultIndexGroups.ts'
import { indexGroupsStorageKey } from '../services/persistence/indexSettingsSchemaVersion.ts'
import { saveIndexGroups } from '../services/persistence/saveIndexGroups.ts'
import { useIndexQuotesStore } from './useIndexQuotesStore.ts'

test('syncFromStorage replaces groups from the persisted index settings', () => {
  const storage = new MemoryStorage()
  const restore = installLocalStorage(storage)
  const windowFake = installStorageWindow()
  try {
    setActivePinia(createPinia())
    const store = useIndexQuotesStore()
    const storedGroups = [{ id: 'custom', name: '自定义', quoteCodes: ['1.000001'] }]
    saveIndexGroups(storedGroups)

    windowFake.dispatch({
      key: indexGroupsStorageKey,
      newValue: storage.getItem(indexGroupsStorageKey),
    })

    assert.deepEqual(store.groups, storedGroups)
    store.$dispose()
  } finally {
    windowFake.restore()
    restore()
  }
})

test('syncFromStorage tolerates read failures without clearing default groups', () => {
  const storage = new MemoryStorage()
  storage.readError = new Error('read failed')
  const restore = installLocalStorage(storage)
  const windowFake = installStorageWindow()
  try {
    setActivePinia(createPinia())
    const store = useIndexQuotesStore()

    assert.doesNotThrow(() =>
      windowFake.dispatch({ key: indexGroupsStorageKey, newValue: 'changed' }),
    )
    assert.deepEqual(store.groups, defaultIndexGroups)
    store.$dispose()
  } finally {
    windowFake.restore()
    restore()
  }
})

test('commitGroups updates memory only after the write succeeds', () => {
  const storage = new MemoryStorage()
  const restore = installLocalStorage(storage)
  try {
    setActivePinia(createPinia())
    const store = useIndexQuotesStore()
    const nextGroups = [{ id: 'custom', name: '自定义', quoteCodes: ['1.000001'] }]

    storage.writeError = new Error('quota exceeded')
    const failed = store.commitGroups(nextGroups)
    assert.equal(failed.ok, false)
    if (!failed.ok) assert.equal(failed.reason, 'persistence-failed')
    assert.deepEqual(store.groups, defaultIndexGroups)

    storage.writeError = undefined
    const succeeded = store.commitGroups(nextGroups)
    assert.equal(succeeded.ok, true)
    assert.deepEqual(store.groups, nextGroups)
    store.$dispose()
  } finally {
    restore()
  }
})

test('commitGroups rejects invalid groups without writing or changing memory', () => {
  const storage = new MemoryStorage()
  const restore = installLocalStorage(storage)
  try {
    setActivePinia(createPinia())
    const store = useIndexQuotesStore()
    const storedBefore = storage.getItem(indexGroupsStorageKey)

    const result = store.commitGroups([
      { id: 'custom', name: '自定义', quoteCodes: ['unknown-quote'] },
    ])

    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'invalid-groups')
    assert.equal(storage.getItem(indexGroupsStorageKey), storedBefore)
    assert.deepEqual(store.groups, defaultIndexGroups)
    store.$dispose()
  } finally {
    restore()
  }
})

function installStorageWindow(): {
  dispatch(event: Pick<StorageEvent, 'key' | 'newValue'>): void
  restore(): void
} {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let listener: ((event: StorageEvent) => void) | undefined
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener(type: string, nextListener: (event: StorageEvent) => void): void {
        if (type === 'storage') listener = nextListener
      },
      removeEventListener(type: string, nextListener: (event: StorageEvent) => void): void {
        if (type === 'storage' && listener === nextListener) listener = undefined
      },
    },
  })

  return {
    dispatch(event): void {
      listener?.(event as StorageEvent)
    },
    restore(): void {
      if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
      else Reflect.deleteProperty(globalThis, 'window')
    },
  }
}
