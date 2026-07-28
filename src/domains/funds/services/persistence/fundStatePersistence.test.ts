import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundState } from '../../models/fundState.ts'
import { createTestFundSnapshot } from '../../testing/createTestFundSnapshot.ts'
import {
  FUND_STATE_SCHEMA_VERSION,
  corruptFundStateStorageKeyPrefix,
  fundStateStorageKey,
} from './fundStateSchemaVersion.ts'
import { loadFundState } from './loadFundState.ts'
import { saveFundState } from './saveFundState.ts'

const emptyFundState: FundState = {
  fundOrder: [],
  groups: [],
  holdingOrder: [],
  holdingsByCode: {},
  snapshotsByCode: {},
}

test('loadFundState stays empty without local storage data and preserves a valid empty state', () => {
  withStorage((storage) => {
    assert.deepEqual(loadFundState(), emptyFundState)
    assert.equal(storage.getItem(fundStateStorageKey), null)

    const empty: FundState = {
      fundOrder: [],
      groups: [],
      holdingOrder: [],
      holdingsByCode: {},
      snapshotsByCode: {},
    }
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

test('v4 holdings and their independent order round trip and orphaned data is filtered', () => {
  withStorage((storage) => {
    const state: FundState = {
      fundOrder: ['000001', '000002'],
      groups: [],
      holdingOrder: ['000002', '000001'],
      holdingsByCode: {
        '000001': {
          code: '000001',
          costPrice: 1.2345,
          dividendMode: 'reinvest',
          purchaseDate: '2020-02-29',
          units: 100.5,
        },
        '000002': {
          code: '000002',
          costPrice: 2,
          dividendMode: 'cash',
          purchaseDate: '2021-01-01',
          units: 20,
        },
      },
      snapshotsByCode: {
        '000001': createTestFundSnapshot('000001'),
        '000002': createTestFundSnapshot('000002'),
      },
    }
    saveFundState(state)
    assert.deepEqual(loadFundState(), state)

    storage.setItem(
      fundStateStorageKey,
      JSON.stringify({
        ...state,
        holdingsByCode: {
          ...state.holdingsByCode,
          '999999': {
            code: '999999',
            costPrice: 1,
            dividendMode: 'cash',
            purchaseDate: '2020-01-01',
            units: 1,
          },
        },
        version: FUND_STATE_SCHEMA_VERSION,
      }),
    )
    assert.deepEqual(loadFundState().holdingsByCode, state.holdingsByCode)
  })
})

test('holding order must contain every holding exactly once and only known held funds', () => {
  const base: FundState = {
    fundOrder: ['000001', '000002'],
    groups: [],
    holdingOrder: ['000001'],
    holdingsByCode: {
      '000001': {
        code: '000001',
        costPrice: 1,
        dividendMode: 'cash',
        purchaseDate: '2020-01-01',
        units: 1,
      },
    },
    snapshotsByCode: {
      '000001': createTestFundSnapshot('000001'),
      '000002': createTestFundSnapshot('000002'),
    },
  }

  for (const holdingOrder of [
    [],
    ['000001', '000001'],
    ['000001', '000002'],
    ['000001', '999999'],
  ]) {
    withStorage(() => {
      assert.throws(() => saveFundState({ ...base, holdingOrder }), /holding order/i)
    })
  }
})

test('holdings reject invalid numbers, precision, codes, dates and dividend modes', () => {
  const base: FundState = {
    fundOrder: ['000001'],
    groups: [],
    holdingOrder: [],
    holdingsByCode: {},
    snapshotsByCode: { '000001': createTestFundSnapshot('000001') },
  }
  for (const holding of [
    {
      code: '000001',
      costPrice: 0,
      dividendMode: 'cash',
      purchaseDate: '2020-01-01',
      units: 1,
    },
    {
      code: '000001',
      costPrice: 1,
      dividendMode: 'cash',
      purchaseDate: '2020-01-01',
      units: 1.23456,
    },
    {
      code: '000002',
      costPrice: 1,
      dividendMode: 'cash',
      purchaseDate: '2020-01-01',
      units: 1,
    },
    {
      code: '000001',
      costPrice: 1,
      dividendMode: 'cash',
      purchaseDate: '2020-02-30',
      units: 1,
    },
    {
      code: '000001',
      costPrice: 1,
      dividendMode: 'cash',
      purchaseDate: '2999-01-01',
      units: 1,
    },
    {
      code: '000001',
      costPrice: 1,
      dividendMode: 'unknown',
      purchaseDate: '2020-01-01',
      units: 1,
    },
    { code: '000001', costPrice: 1, purchaseDate: '2020-01-01', units: 1 },
  ]) {
    withStorage(() => {
      assert.throws(
        () =>
          saveFundState({
            ...base,
            holdingOrder: ['000001'],
            holdingsByCode: { '000001': holding },
          } as unknown as FundState),
        /holding/,
      )
    })
  }
})

test('v4 loading ignores but does not remove old keys', () => {
  withStorage((storage) => {
    storage.setItem('pure-hold:fund-state:v1', JSON.stringify({ legacy: true }))
    storage.setItem('pure-hold:fund-state:v2', JSON.stringify({ legacy: true }))
    storage.setItem('pure-hold:fund-state:v3', JSON.stringify({ legacy: true }))
    assert.deepEqual(loadFundState(), emptyFundState)
    assert.equal(storage.getItem('pure-hold:fund-state:v1'), JSON.stringify({ legacy: true }))
    assert.equal(storage.getItem('pure-hold:fund-state:v2'), JSON.stringify({ legacy: true }))
    assert.equal(storage.getItem('pure-hold:fund-state:v3'), JSON.stringify({ legacy: true }))
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
