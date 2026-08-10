import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import type { FundSettings } from '../models/fundSettings.ts'
import { fundSettingsStorageKey } from '../services/persistence/fundSettingsSchemaVersion.ts'
import { saveFundSettings } from '../services/persistence/saveFundSettings.ts'
import { useFundsStore } from './useFundsStore.ts'

test('retries same-name persistence after a previous refresh failure', async () => {
  await withEnvironment(async (storage) => {
    saveFundSettings(createTestFundSettings())
    storage.failWrites = true
    setActivePinia(createPinia())
    const store = useFundsStore()
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => createSnapshotResponse('新名称', '1.5')
    try {
      await store.refreshAll()
      assert.equal(store.snapshotsByCode['161726']?.name, '新名称')
      assert.equal(
        store.lastRefreshIssues.some((issue) => issue.code === 'persistence-failed'),
        true,
      )

      storage.failWrites = false
      await store.refreshAll()
      assert.equal(readStoredSettings(storage).funds[0]?.name, '新名称')
      assert.equal(
        store.lastRefreshIssues.some((issue) => issue.code === 'persistence-failed'),
        false,
      )
    } finally {
      globalThis.fetch = originalFetch
      store.$dispose()
    }
  })
})

test('later settings changes persist the latest observed name', async () => {
  await withEnvironment(async (storage) => {
    saveFundSettings(createTestFundSettings())
    setActivePinia(createPinia())
    const store = useFundsStore()
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => createSnapshotResponse('行情名称', '1.5')
    try {
      storage.failWrites = true
      await store.refreshAll()
      storage.failWrites = false
      assert.deepEqual(store.replaceGroups([]), {})
      assert.equal(readStoredSettings(storage).funds[0]?.name, '行情名称')
    } finally {
      globalThis.fetch = originalFetch
      store.$dispose()
    }
  })
})

test('group changes do not cancel an active market refresh', async () => {
  await withEnvironment(async () => {
    saveFundSettings(createTestFundSettings())
    setActivePinia(createPinia())
    const store = useFundsStore()
    const originalFetch = globalThis.fetch
    let fetchCalls = 0
    let releaseFetch: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseFetch = resolve
    })
    globalThis.fetch = async () => {
      fetchCalls += 1
      await gate
      return createSnapshotResponse('刷新名称', '1.6')
    }
    try {
      const refresh = store.refreshAll()
      await delayUntil(() => fetchCalls === 1)
      assert.deepEqual(store.replaceGroups([]), {})
      releaseFetch()
      await refresh
      assert.equal(store.snapshotsByCode['161726']?.estimatedNav, 1.6)
    } finally {
      globalThis.fetch = originalFetch
      store.$dispose()
    }
  })
})

test('deleting a fund invalidates a late refresh result', async () => {
  await withEnvironment(async () => {
    saveFundSettings({
      ...createTestFundSettings(),
      funds: [
        { code: '161726', name: '基金 161726' },
        { code: '161725', name: '基金 161725' },
      ],
    })
    setActivePinia(createPinia())
    const store = useFundsStore()
    const originalFetch = globalThis.fetch
    let releaseFetch: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseFetch = resolve
    })
    globalThis.fetch = async () => {
      await gate
      return new Response(
        JSON.stringify({
          data: [
            { FCODE: '161726', GSZ: '1.5', SHORTNAME: '迟到名称' },
            { FCODE: '161725', GSZ: '1.6', SHORTNAME: '保留名称' },
          ],
          errorCode: 0,
          success: true,
          totalCount: 2,
        }),
        { status: 200 },
      )
    }
    try {
      const refresh = store.refreshAll()
      await delayUntil(() => store.isRefreshing)
      assert.deepEqual(store.deleteFund('161726'), {})
      releaseFetch()
      await refresh
      assert.equal(store.snapshotsByCode['161726'], undefined)
      assert.equal(store.snapshotsByCode['161725']?.fetchedAt, null)
    } finally {
      globalThis.fetch = originalFetch
      store.$dispose()
    }
  })
})

function createSnapshotResponse(name: string, estimatedNav: string): Response {
  return new Response(
    JSON.stringify({
      data: [{ FCODE: '161726', GSZ: estimatedNav, SHORTNAME: name }],
      errorCode: 0,
      success: true,
      totalCount: 1,
    }),
    { status: 200 },
  )
}

function createTestFundSettings(): FundSettings {
  return {
    funds: [{ code: '161726', name: '基金 161726' }],
    groups: [],
    holdingOrder: [],
    holdingsByCode: {},
  }
}

function readStoredSettings(storage: ToggleStorage): FundSettings {
  const raw = storage.getItem(fundSettingsStorageKey)
  if (raw === null) throw new Error('Expected fund settings to be stored')
  const parsed = JSON.parse(raw) as FundSettings & { version: number }
  return parsed
}

async function delayUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20 && !predicate(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  assert.equal(predicate(), true)
}

async function withEnvironment(callback: (storage: ToggleStorage) => Promise<void>): Promise<void> {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const storage = new ToggleStorage()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  try {
    await callback(storage)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

class ToggleStorage implements Storage {
  readonly values = new Map<string, string>()
  failWrites = false
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
    return [...this.values.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.values.delete(key)
  }
  setItem(key: string, value: string): void {
    if (this.failWrites && key === fundSettingsStorageKey) {
      throw new Error('quota exceeded')
    }
    this.values.set(key, value)
  }
}
