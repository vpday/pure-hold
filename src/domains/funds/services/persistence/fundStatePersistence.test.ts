import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundState } from '../../models/fundState.ts'
import {
  FUND_STATE_SCHEMA_VERSION,
  corruptFundStateStorageKeyPrefix,
  fundStateStorageKey,
} from './fundStateSchemaVersion.ts'
import { loadFundState } from './loadFundState.ts'
import { saveFundState } from './saveFundState.ts'

const emptyFundState: FundState = { fundOrder: [], groups: [], snapshotsByCode: {} }

test('loadFundState stays empty without local storage data and preserves a valid empty state', () => {
  withStorage((storage) => {
    assert.deepEqual(loadFundState(), emptyFundState)
    assert.equal(storage.getItem(fundStateStorageKey), null)

    const empty: FundState = { fundOrder: [], groups: [], snapshotsByCode: {} }
    saveFundState(empty)
    assert.deepEqual(loadFundState(), empty)
  })
})

test('loadFundState backs up malformed data and incompatible versions', () => {
  for (const raw of ['{bad json', JSON.stringify({ version: 0 })]) {
    withStorage((storage) => {
      storage.setItem(fundStateStorageKey, raw)
      withoutWarnings(() => assert.deepEqual(loadFundState(), emptyFundState))
      assert.equal(
        storage.keys().some((key) => key.startsWith(corruptFundStateStorageKeyPrefix)),
        true,
      )
    })
  }
})

test('loadFundState filters group references that are not in fundOrder', () => {
  withStorage((storage) => {
    const persisted = {
      ...emptyFundState,
      groups: [{ fundCodes: ['missing'], id: 'custom', name: ' 自定义 ' }],
      version: FUND_STATE_SCHEMA_VERSION,
    }
    storage.setItem(fundStateStorageKey, JSON.stringify(persisted))
    assert.deepEqual(loadFundState().groups, [{ fundCodes: [], id: 'custom', name: '自定义' }])
  })
})

test('invalid duplicates recover on load and save failures surface', () => {
  withStorage((storage) => {
    storage.setItem(
      fundStateStorageKey,
      JSON.stringify({
        ...emptyFundState,
        fundOrder: ['161726', '161726'],
        version: FUND_STATE_SCHEMA_VERSION,
      }),
    )
    withoutWarnings(() => assert.deepEqual(loadFundState(), emptyFundState))
  })

  withStorage(() => {
    assert.throws(
      () =>
        saveFundState({
          ...emptyFundState,
          groups: [
            { fundCodes: [], id: 'a', name: '重复' },
            { fundCodes: [], id: 'b', name: '重复' },
          ],
        }),
      /duplicate|invalid/,
    )
  })

  withStorage(() => {
    assert.throws(() => saveFundState(emptyFundState), /quota exceeded/)
  }, new ThrowingStorage())
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
