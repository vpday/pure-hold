import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { installLocalStorage, MemoryStorage } from '@/shared/testing/browserStorageTestSupport.ts'
import type { FundSettings } from '../models/fundSettings.ts'
import type { FundSnapshot } from '../models/fundSnapshot.ts'
import { fundSettingsStorageKey } from '../services/persistence/fundSettingsSchemaVersion.ts'
import { saveFundSettings } from '../services/persistence/saveFundSettings.ts'
import { useFundsStore } from './useFundsStore.ts'

test('retries same-name persistence after a previous refresh failure', async () => {
  await withEnvironment(async (storage) => {
    saveFundSettings(createTestFundSettings())
    storage.writeError = new Error('quota exceeded')
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

      storage.writeError = undefined
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
      storage.writeError = new Error('quota exceeded')
      await store.refreshAll()
      storage.writeError = undefined
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

test('complete settings replacement reconciles runtime snapshots and refreshes imported funds', async () => {
  await withEnvironment(async (storage) => {
    saveFundSettings(createTestFundSettings())
    setActivePinia(createPinia())
    const store = useFundsStore()
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [
            { FCODE: '161726', GSZ: '1.7', SHORTNAME: '导入后的名称' },
            { FCODE: '000001', GSZ: '2.1', SHORTNAME: '新增名称' },
          ],
          errorCode: 0,
          success: true,
          totalCount: 2,
        }),
        { status: 200 },
      )
    try {
      const result = store.replaceSettingsPersisted({
        funds: [
          { code: '161726', name: '导入配置名称' },
          { code: '000001', name: '新增基金' },
        ],
        groups: [{ fundCodes: ['000001'], id: 'new', name: '新分组' }],
        holdingOrder: [],
        holdingsByCode: {},
      })
      assert.deepEqual(result, { ok: true })
      assert.equal(store.snapshotsByCode['161726']?.name, '导入配置名称')
      assert.equal(store.snapshotsByCode['000001']?.name, '新增基金')
      await delayUntil(() => store.snapshotsByCode['000001']?.estimatedNav === 2.1)
      assert.equal(store.snapshotsByCode['161726']?.estimatedNav, 1.7)
      assert.equal(readStoredSettings(storage).funds[1]?.code, '000001')
    } finally {
      globalThis.fetch = originalFetch
      store.$dispose()
    }
  })
})

test('retains only the previous confirmed snapshot when the NAV date advances', async () => {
  await withEnvironment(async () => {
    saveFundSettings(createTestFundSettings())
    setActivePinia(createPinia())
    const store = useFundsStore()
    const responses = [
      createConfirmedSnapshotResponse('2026-08-07', '1.5'),
      createConfirmedSnapshotResponse('2026-08-07', '1.6'),
      createConfirmedSnapshotResponse('2026-08-10', '1.7'),
      createConfirmedSnapshotResponse('2026-08-07', '1.4'),
    ]
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => responses.shift()!
    try {
      await store.refreshAll()
      assert.equal(snapshotAt(store.previousSnapshotsByCode, '161726'), undefined)

      await store.refreshAll()
      assert.equal(snapshotAt(store.previousSnapshotsByCode, '161726'), undefined)

      await store.refreshAll()
      assert.equal(store.snapshotsByCode['161726']?.nav, 1.7)
      assert.equal(snapshotAt(store.previousSnapshotsByCode, '161726')?.nav, 1.6)
      assert.equal(snapshotAt(store.previousSnapshotsByCode, '161726')?.navDate, '2026-08-07')

      await store.refreshAll()
      assert.equal(store.snapshotsByCode['161726']?.nav, 1.7)
      assert.equal(snapshotAt(store.previousSnapshotsByCode, '161726')?.nav, 1.6)

      assert.deepEqual(store.deleteFund('161726'), {})
      assert.equal(snapshotAt(store.previousSnapshotsByCode, '161726'), undefined)
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

function snapshotAt(
  snapshots: Readonly<Record<string, FundSnapshot>>,
  code: string,
): FundSnapshot | undefined {
  return snapshots[code]
}

function createConfirmedSnapshotResponse(navDate: string, nav: string): Response {
  return new Response(
    JSON.stringify({
      data: [
        {
          FCODE: '161726',
          NAV: nav,
          NAVCHGRT: '1',
          PDATE: navDate,
          SHORTNAME: '基金 161726',
        },
      ],
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

function readStoredSettings(storage: MemoryStorage): FundSettings {
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

async function withEnvironment(callback: (storage: MemoryStorage) => Promise<void>): Promise<void> {
  const storage = new MemoryStorage()
  const restore = installLocalStorage(storage)
  try {
    await callback(storage)
  } finally {
    restore()
  }
}
