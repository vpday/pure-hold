import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinia, setActivePinia } from 'pinia'
import {
  defaultAppRefreshPreferences,
  type AppRefreshPreferences,
} from '../models/appRefreshPreferences.ts'
import { useAppSettingsStore } from '../stores/useAppSettingsStore.ts'
import { installLocalStorage, MemoryStorage } from '@/shared/testing/browserStorageTestSupport.ts'
import {
  appSettingsStorageKey,
  corruptAppSettingsStorageKeyPrefix,
} from './appSettingsSchemaVersion.ts'
import { loadAppRefreshPreferences } from './loadAppRefreshPreferences.ts'
import { saveAppRefreshPreferences } from './saveAppRefreshPreferences.ts'

test('app refresh preferences persist defaults and valid values', () => {
  withStorage((storage) => {
    assert.deepEqual(loadAppRefreshPreferences(), defaultAppRefreshPreferences)
    const preferences: AppRefreshPreferences = {
      funds: { enabled: false, intervalMinutes: 5 },
      index: { enabled: true, intervalSeconds: 30 },
    }
    saveAppRefreshPreferences(preferences)
    assert.deepEqual(loadAppRefreshPreferences(), preferences)
    assert.equal(storage.getItem(appSettingsStorageKey)?.includes('marketDataByCode'), false)
  })
})

test('app refresh preferences recover malformed data and keep storage failures non-blocking', () => {
  withStorage((storage) => {
    storage.setItem(appSettingsStorageKey, '{bad json')
    withoutWarnings(() =>
      assert.deepEqual(loadAppRefreshPreferences(), defaultAppRefreshPreferences),
    )
    assert.equal(
      storage.keys().some((key) => key.startsWith(corruptAppSettingsStorageKeyPrefix)),
      true,
    )
  })

  const restore = installLocalStorage(undefined)
  try {
    assert.deepEqual(loadAppRefreshPreferences(), defaultAppRefreshPreferences)
  } finally {
    restore()
  }
})

test('app refresh preferences validate source-specific ranges and commit persist-first', () => {
  withStorage((storage) => {
    setActivePinia(createPinia())
    const store = useAppSettingsStore()
    assert.deepEqual(
      store.commit({
        funds: { enabled: true, intervalMinutes: 3 },
        index: { enabled: false, intervalSeconds: 20 },
      }),
      {
        ok: true,
        preferences: {
          funds: { enabled: true, intervalMinutes: 3 },
          index: { enabled: false, intervalSeconds: 20 },
        },
      },
    )
    assert.deepEqual(loadAppRefreshPreferences(), store.getSnapshot())

    const beforeFailure = store.getSnapshot()
    storage.writeError = new Error('quota exceeded')
    assert.deepEqual(
      store.commit({
        funds: { enabled: true, intervalMinutes: 4 },
        index: { enabled: true, intervalSeconds: 40 },
      }),
      { ok: false, reason: 'persistence-failed' },
    )
    assert.deepEqual(store.getSnapshot(), beforeFailure)
  })
})

test('app refresh preferences reject invalid values', () => {
  withStorage(() => {
    assert.throws(
      () =>
        saveAppRefreshPreferences({
          funds: { enabled: true, intervalMinutes: 6 },
          index: { enabled: true, intervalSeconds: 10 },
        }),
      /invalid interval/,
    )
  })
})

function withoutWarnings(callback: () => void): void {
  const warn = console.warn
  console.warn = () => {}
  try {
    callback()
  } finally {
    console.warn = warn
  }
}

function withStorage(callback: (storage: MemoryStorage) => void): void {
  const storage = new MemoryStorage()
  const restore = installLocalStorage(storage)
  try {
    callback(storage)
  } finally {
    restore()
  }
}
