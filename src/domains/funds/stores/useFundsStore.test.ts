import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { fundStateStorageKey } from '../services/persistence/fundStateSchemaVersion.ts'
import { saveFundState } from '../services/persistence/saveFundState.ts'
import { createTestFundSnapshot } from '../testing/createTestFundSnapshot.ts'
import { useFundsStore } from './useFundsStore.ts'

test('fund store deduplicates refreshes, merges partial success and reports save failure', async () => {
  await withEnvironment(async (storage) => {
    saveFundState(createTestFundState())
    setActivePinia(createPinia())
    const store = useFundsStore()
    let fetchCalls = 0
    let releaseFetch: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseFetch = resolve
    })
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      fetchCalls += 1
      await gate
      return new Response(
        JSON.stringify({
          data: [{ FCODE: '161726', GSZ: '1.5', SHORTNAME: '更新基金' }],
          errorCode: 0,
          success: true,
          totalCount: 1,
        }),
        { status: 200 },
      )
    }
    try {
      const first = store.refreshAll()
      const second = store.refreshAll()
      releaseFetch()
      await Promise.all([first, second])
      assert.equal(fetchCalls, 1)
      assert.equal(store.snapshotsByCode['161726']?.estimatedNav, 1.5)
      assert.equal(
        store.lastRefreshIssues.some((issue) => issue.code === 'missing-record'),
        true,
      )

      storage.failWrites = true
      await store.refreshAll()
      assert.equal(
        store.lastRefreshIssues.some((issue) => issue.code === 'persistence-failed'),
        true,
      )
      assert.equal(store.snapshotsByCode['161726']?.estimatedNav, 1.5)
    } finally {
      globalThis.fetch = originalFetch
      store.$dispose()
    }
  })
})

test('fund deletion persists first and removes every group relation', async () => {
  await withEnvironment(async (storage) => {
    saveFundState({
      ...createTestFundState(),
      groups: [
        { fundCodes: ['161726', '161725'], id: 'one', name: '一组' },
        { fundCodes: ['161726'], id: 'two', name: '二组' },
      ],
    })
    setActivePinia(createPinia())
    const store = useFundsStore()
    assert.deepEqual(store.deleteFund('161726'), {})
    assert.equal(store.fundOrder.includes('161726'), false)
    assert.equal(store.snapshotsByCode['161726'], undefined)
    assert.equal(store.holdingsByCode['161726'], undefined)
    assert.equal(
      store.groups.every((group) => !group.fundCodes.includes('161726')),
      true,
    )

    const before = [...store.fundOrder]
    storage.failWrites = true
    assert.match(store.deleteFund('161725').error ?? '', /删除失败/)
    assert.deepEqual(store.fundOrder, before)
    store.$dispose()
  })
})

test('fund addition persists atomically and refreshes only the new funds', async () => {
  await withEnvironment(async (storage) => {
    saveFundState(createTestFundState())
    setActivePinia(createPinia())
    const store = useFundsStore()
    const requestedBodies: string[] = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (_input, init) => {
      requestedBodies.push(String(init?.body))
      return new Response(
        JSON.stringify({
          data: [{ FCODE: '000001', GSZ: '2.5', SHORTNAME: '新增基金' }],
          errorCode: 0,
          success: true,
          totalCount: 1,
        }),
        { status: 200 },
      )
    }
    try {
      const groupsBefore = store.groups
      assert.deepEqual(
        store.addFunds([
          {
            code: '000001',
            holding: {
              code: '000001',
              costPrice: 2,
              purchaseDate: '2020-01-01',
              units: 10,
            },
            name: ' 新增基金 ',
          },
          { code: '000002', name: '空行情基金' },
        ]),
        {},
      )
      assert.deepEqual(store.fundOrder.slice(-2), ['000001', '000002'])
      assert.equal(store.snapshotsByCode['000002']?.nav, null)
      assert.equal(store.snapshotsByCode['000002']?.name, '空行情基金')
      assert.equal(store.holdingsByCode['000001']?.units, 10)
      assert.equal(store.holdingsByCode['000002'], undefined)
      assert.deepEqual(store.groups, groupsBefore)
      await delayUntil(() => requestedBodies.length === 1)
      assert.equal(new URLSearchParams(requestedBodies[0]).get('CODES'), '000001,000002')

      const before = [...store.fundOrder]
      assert.match(store.addFunds([{ code: '000001', name: '重复' }]).error ?? '', /重复/)
      assert.deepEqual(store.fundOrder, before)

      storage.failWrites = true
      assert.match(store.addFunds([{ code: '000003', name: '保存失败' }]).error ?? '', /添加失败/)
      assert.equal(store.fundOrder.includes('000003'), false)
    } finally {
      globalThis.fetch = originalFetch
      store.$dispose()
    }
  })
})

function createTestFundState() {
  return {
    fundOrder: ['161726', '161725'],
    groups: [],
    holdingsByCode: {
      '161726': {
        code: '161726',
        costPrice: 1.2345,
        purchaseDate: '2020-01-01',
        units: 100,
      },
    },
    snapshotsByCode: {
      '161725': createTestFundSnapshot('161725'),
      '161726': createTestFundSnapshot('161726'),
    },
  }
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
    if (this.failWrites && key === fundStateStorageKey) {
      throw new Error('quota exceeded')
    }
    this.values.set(key, value)
  }
}
