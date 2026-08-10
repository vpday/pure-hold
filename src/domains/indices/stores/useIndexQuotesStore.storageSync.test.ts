import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { MemoryStorage, installLocalStorage } from '@/shared/testing/browserStorageTestSupport.ts'
import { defaultIndexGroups } from '../config/defaultIndexGroups.ts'
import { saveIndexGroups } from '../services/persistence/saveIndexGroups.ts'
import { useIndexQuotesStore } from './useIndexQuotesStore.ts'

test('syncFromStorage replaces groups from the persisted index settings', () => {
  const storage = new MemoryStorage()
  const restore = installLocalStorage(storage)
  try {
    setActivePinia(createPinia())
    const store = useIndexQuotesStore()
    const storedGroups = [{ id: 'custom', name: '自定义', quoteCodes: ['1.000001'] }]
    saveIndexGroups(storedGroups)

    store.syncFromStorage()

    assert.deepEqual(store.groups, storedGroups)
    store.$dispose()
  } finally {
    restore()
  }
})

test('syncFromStorage tolerates read failures without clearing default groups', () => {
  const storage = new MemoryStorage()
  storage.readError = new Error('read failed')
  const restore = installLocalStorage(storage)
  try {
    setActivePinia(createPinia())
    const store = useIndexQuotesStore()

    assert.doesNotThrow(() => store.syncFromStorage())
    assert.deepEqual(store.groups, defaultIndexGroups)
    store.$dispose()
  } finally {
    restore()
  }
})
