import assert from 'node:assert/strict'
import test from 'node:test'

import type { FieldValue, Portfolio, PortfolioEvent } from '../../models/index.ts'
import { installLocalStorage, MemoryStorage } from '@/shared/testing/browserStorageTestSupport.ts'
import {
  corruptPortfolioStorageKeyPrefix,
  PORTFOLIO_SCHEMA_VERSION,
  portfolioStorageKey,
} from './portfolioSchemaVersion.ts'
import { loadPortfolio } from './loadPortfolio.ts'
import { createPortfolioPersistence } from './portfolioPersistence.ts'
import { savePortfolio } from './savePortfolio.ts'

const actual = (value: number): FieldValue<number> => ({
  confidence: 'actual',
  source: 'manual',
  value,
})

const unknown = (): FieldValue<number> => ({
  confidence: 'unknown',
  source: 'manual',
  value: null,
})

function buyEvent(overrides: Partial<PortfolioEvent> = {}): PortfolioEvent {
  return {
    auditedAt: '2026-08-13T09:00:00.000Z',
    confirmedDate: '2026-08-12',
    createdAt: '2026-08-13T09:00:00.000Z',
    fundCode: '000001',
    id: 'event-1',
    kind: 'buy',
    purchaseFee: unknown(),
    purchaseFeeRate: actual(1),
    settlementStatus: 'pending-settlement',
    source: 'manual',
    totalAmount: actual(10000),
    unitNav: unknown(),
    units: unknown(),
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  } as PortfolioEvent
}

function portfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    events: [buyEvent()],
    fundCodes: ['000001'],
    ...overrides,
  }
}

test('loads an empty portfolio and round trips version two facts as detached objects', () => {
  withStorage((storage) => {
    assert.deepEqual(loadPortfolio(), { events: [], fundCodes: [] })

    const input = portfolio()
    savePortfolio(input)
    const loaded = loadPortfolio()

    assert.deepEqual(loaded, input)
    assert.notStrictEqual(loaded, input)
    assert.notStrictEqual(loaded.events, input.events)
    assert.notStrictEqual(loaded.events[0], input.events[0])
    assert.equal(JSON.parse(storage.getItem(portfolioStorageKey) ?? '').version, 2)
    assert.equal(JSON.stringify(input).includes('batches'), false)
  })
})

test('exposes one public persistence seam for loading and saving portfolio facts', () => {
  withStorage(() => {
    const persistence = createPortfolioPersistence()
    assert.deepEqual(persistence.load(), emptyPortfolio())
    persistence.save(portfolio())
    assert.deepEqual(persistence.load(), portfolio())
  })
})

test('uses a new storage key without reading the retired schema', () => {
  withStorage((storage) => {
    const retiredKey = 'pure-hold:portfolio:v1'
    storage.setItem(retiredKey, JSON.stringify({ version: 1, ...portfolio() }))

    assert.deepEqual(loadPortfolio(), emptyPortfolio())
    assert.notEqual(storage.getItem(retiredKey), null)

    savePortfolio(portfolio())
    assert.equal(JSON.parse(storage.getItem(portfolioStorageKey) ?? '').version, 2)
  })
})

test('rejects invalid portfolio shape, retired fields, unknown fields, duplicate IDs, precision, and dates', () => {
  withStorage(() => {
    assert.throws(
      () => savePortfolio({ ...portfolio(), unexpected: true } as never),
      /unknown|portfolio/i,
    )
    assert.throws(() => savePortfolio({ ...portfolio(), plans: [] } as never), /unknown|portfolio/i)
    assert.throws(
      () => savePortfolio({ ...portfolio(), events: [buyEvent(), buyEvent({ id: 'event-1' })] }),
      /duplicate/i,
    )
    assert.throws(
      () => savePortfolio({ ...portfolio(), events: [buyEvent({ totalAmount: actual(1.1) })] }),
      /amount/i,
    )
    assert.throws(
      () => savePortfolio({ ...portfolio(), events: [buyEvent({ units: actual(1.23456) })] }),
      /units/i,
    )
    assert.throws(
      () => savePortfolio({ ...portfolio(), events: [buyEvent({ confirmedDate: '2026-02-30' })] }),
      /date/i,
    )
  })
})

test('backs up corrupt data and restores an empty portfolio', () => {
  withStorage((storage) => {
    for (const raw of ['{bad json', JSON.stringify({ version: 0, events: [] })]) {
      storage.setItem(portfolioStorageKey, raw)
      withoutWarnings(() => assert.deepEqual(loadPortfolio(), emptyPortfolio()))
      assert.equal(
        storage.keys().some((key) => key.startsWith(corruptPortfolioStorageKeyPrefix)),
        true,
      )
      assert.deepEqual(JSON.parse(storage.getItem(portfolioStorageKey) ?? ''), {
        ...emptyPortfolio(),
        version: PORTFOLIO_SCHEMA_VERSION,
      })
    }
  })
})

test('keeps startup available when storage cannot be read and surfaces write failures', () => {
  const unavailable = installLocalStorage(undefined)
  try {
    assert.deepEqual(loadPortfolio(), emptyPortfolio())
    assert.throws(() => savePortfolio(portfolio()), /unavailable/i)
  } finally {
    unavailable()
  }

  const storage = new MemoryStorage()
  storage.readError = new Error('storage unavailable')
  withStorage(() => assert.deepEqual(loadPortfolio(), emptyPortfolio()), storage)

  storage.writeError = new Error('quota exceeded')
  withStorage(() => assert.throws(() => savePortfolio(portfolio()), /quota exceeded/), storage)
})

function emptyPortfolio(): Portfolio {
  return { events: [], fundCodes: [] }
}

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
