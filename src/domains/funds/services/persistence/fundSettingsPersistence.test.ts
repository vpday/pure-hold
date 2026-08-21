import assert from 'node:assert/strict'
import test from 'node:test'

import { installLocalStorage, MemoryStorage } from '@/shared/testing/browserStorageTestSupport.ts'
import type { FundSettings } from '../../models/fundSettings.ts'
import {
  corruptFundSettingsStorageKeyPrefix,
  FUND_SETTINGS_SCHEMA_VERSION,
  fundSettingsStorageKey,
} from './fundSettingsSchemaVersion.ts'
import { loadFundSettings } from './loadFundSettings.ts'
import { saveFundSettings } from './saveFundSettings.ts'

const emptyFundSettings: FundSettings = {
  funds: [],
  groups: [],
  holdingOrder: [],
  holdingsByCode: {},
}

test('loadFundSettings stays empty without local storage data and preserves a valid empty state', () => {
  withStorage((storage) => {
    assert.deepEqual(loadFundSettings(), emptyFundSettings)
    assert.equal(storage.getItem(fundSettingsStorageKey), null)

    saveFundSettings(emptyFundSettings)
    assert.deepEqual(loadFundSettings(), emptyFundSettings)
  })
})

test('loadFundSettings stays empty when local storage is unavailable or cannot be read', () => {
  const restore = installLocalStorage(undefined)
  try {
    assert.deepEqual(loadFundSettings(), emptyFundSettings)
  } finally {
    restore()
  }

  const storage = new MemoryStorage()
  storage.readError = new Error('storage unavailable')
  withStorage(() => assert.deepEqual(loadFundSettings(), emptyFundSettings), storage)
})

test('loadFundSettings backs up malformed data and incompatible versions', () => {
  for (const raw of ['{bad json', JSON.stringify({ version: 0 })]) {
    withStorage((storage) => {
      storage.setItem(fundSettingsStorageKey, raw)
      withoutWarnings(() => assert.deepEqual(loadFundSettings(), emptyFundSettings))
      assert.equal(
        storage.keys().some((key) => key.startsWith(corruptFundSettingsStorageKeyPrefix)),
        true,
      )
    })
  }
})

test('loadFundSettings filters unknown group and holding references', () => {
  withStorage((storage) => {
    const persisted = {
      ...emptyFundSettings,
      funds: [{ code: '000001', name: '基金' }],
      groups: [{ fundCodes: ['missing'], id: 'custom', name: ' 自定义 ' }],
      holdingOrder: ['missing'],
      holdingsByCode: {
        missing: {
          code: 'missing',
          dividendMode: 'cash',
          purchaseDate: '2020-01-01',
          totalCostCents: 100,
          units: 1,
        },
      },
      version: FUND_SETTINGS_SCHEMA_VERSION,
    }
    storage.setItem(fundSettingsStorageKey, JSON.stringify(persisted))
    assert.deepEqual(loadFundSettings(), {
      ...emptyFundSettings,
      funds: [{ code: '000001', name: '基金' }],
      groups: [{ fundCodes: [], id: 'custom', name: '自定义' }],
    })
  })
})

test('fund settings round trip without persisting runtime snapshots', () => {
  withStorage((storage) => {
    const settings: FundSettings = {
      funds: [
        { code: '000001', name: '基金一' },
        { code: '000002', name: '基金二' },
      ],
      groups: [],
      holdingOrder: ['000002', '000001'],
      holdingsByCode: {
        '000001': {
          code: '000001',
          dividendMode: 'reinvest',
          purchaseDate: '2020-02-29',
          totalCostCents: 12345,
          units: 100.5,
        },
        '000002': {
          code: '000002',
          dividendMode: 'cash',
          purchaseDate: '2021-01-01',
          totalCostCents: 4000,
          units: 20,
        },
      },
    }
    saveFundSettings(settings)
    assert.deepEqual(loadFundSettings(), settings)
    const raw = storage.getItem(fundSettingsStorageKey) ?? ''
    assert.equal(raw.includes('marketDataByCode'), false)
  })
})

test('allows a zero projection while rejecting legacy persisted costPrice data', () => {
  withStorage((storage) => {
    const zeroSettings: FundSettings = {
      funds: [{ code: '000001', name: '基金' }],
      groups: [],
      holdingOrder: ['000001'],
      holdingsByCode: {
        '000001': {
          code: '000001',
          dividendMode: 'cash',
          purchaseDate: '2020-01-01',
          totalCostCents: 0,
          units: 0,
        },
      },
    }
    saveFundSettings(zeroSettings)
    assert.deepEqual(loadFundSettings(), zeroSettings)

    storage.setItem(
      fundSettingsStorageKey,
      JSON.stringify({
        ...zeroSettings,
        holdingsByCode: {
          '000001': {
            code: '000001',
            costPrice: 1,
            dividendMode: 'cash',
            purchaseDate: '2020-01-01',
            units: 1,
          },
        },
        version: FUND_SETTINGS_SCHEMA_VERSION,
      }),
    )
    withoutWarnings(() => assert.deepEqual(loadFundSettings(), emptyFundSettings))
    assert.equal(
      storage.keys().some((key) => key.startsWith(corruptFundSettingsStorageKeyPrefix)),
      true,
    )
  })
})

test('holding order must contain every holding exactly once and only known held funds', () => {
  const base: FundSettings = {
    funds: [
      { code: '000001', name: '基金一' },
      { code: '000002', name: '基金二' },
    ],
    groups: [],
    holdingOrder: ['000001'],
    holdingsByCode: {
      '000001': {
        code: '000001',
        dividendMode: 'cash',
        purchaseDate: '2020-01-01',
        totalCostCents: 10000,
        units: 1,
      },
    },
  }

  for (const holdingOrder of [
    [],
    ['000001', '000001'],
    ['000001', '000002'],
    ['000001', '999999'],
  ]) {
    withStorage(() => {
      assert.throws(() => saveFundSettings({ ...base, holdingOrder }), /holding order/i)
    })
  }
})

test('fund settings reject invalid codes, names, numbers, dates and dividend modes', () => {
  const base: FundSettings = {
    funds: [{ code: '000001', name: '基金一' }],
    groups: [],
    holdingOrder: [],
    holdingsByCode: {},
  }
  for (const [funds, holding] of [
    [[{ code: '00001', name: '基金' }], undefined],
    [[{ code: '000001', name: ' ' }], undefined],
    [
      base.funds,
      {
        code: '000001',
        dividendMode: 'cash',
        purchaseDate: '2020-01-01',
        totalCostCents: 0,
        units: 1,
      },
    ],
    [
      base.funds,
      {
        code: '000001',
        dividendMode: 'cash',
        purchaseDate: '2020-01-01',
        totalCostCents: 10000,
        units: 1.23456,
      },
    ],
    [
      base.funds,
      {
        code: '000001',
        dividendMode: 'cash',
        purchaseDate: '2020-02-30',
        totalCostCents: 10000,
        units: 1,
      },
    ],
    [
      base.funds,
      {
        code: '000001',
        dividendMode: 'unknown',
        purchaseDate: '2020-01-01',
        totalCostCents: 10000,
        units: 1,
      },
    ],
  ] as const) {
    withStorage(() => {
      assert.throws(
        () =>
          saveFundSettings({
            ...base,
            funds,
            holdingOrder: holding ? ['000001'] : [],
            holdingsByCode: holding ? { '000001': holding } : {},
          } as unknown as FundSettings),
        /fund|holding/i,
      )
    })
  }
})

test('new loader ignores but does not remove the old v4 state key', () => {
  withStorage((storage) => {
    const legacyKey = 'pure-hold:fund-state:v4'
    storage.setItem(legacyKey, JSON.stringify({ legacy: true }))
    assert.deepEqual(loadFundSettings(), emptyFundSettings)
    assert.equal(storage.getItem(legacyKey), JSON.stringify({ legacy: true }))
  })
})

test('invalid duplicates recover on load and save failures surface', () => {
  withStorage((storage) => {
    storage.setItem(
      fundSettingsStorageKey,
      JSON.stringify({
        ...emptyFundSettings,
        funds: [
          { code: '161726', name: '基金' },
          { code: '161726', name: '基金二' },
        ],
        version: FUND_SETTINGS_SCHEMA_VERSION,
      }),
    )
    withoutWarnings(() => assert.deepEqual(loadFundSettings(), emptyFundSettings))
  })

  withStorage(() => {
    assert.throws(
      () =>
        saveFundSettings({
          ...emptyFundSettings,
          funds: [
            { code: '000001', name: '重复' },
            { code: '000002', name: '重复' },
          ],
          groups: [
            { fundCodes: [], id: 'a', name: '重复' },
            { fundCodes: [], id: 'b', name: '重复' },
          ],
        }),
      /duplicate|invalid/i,
    )
  })

  const storage = new MemoryStorage()
  storage.writeError = new Error('quota exceeded')
  withStorage(() => {
    assert.throws(() => saveFundSettings(emptyFundSettings), /quota exceeded/)
  }, storage)
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
  const restore = installLocalStorage(storage)
  try {
    callback(storage)
  } finally {
    restore()
  }
}
