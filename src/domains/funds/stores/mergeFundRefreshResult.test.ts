import assert from 'node:assert/strict'
import test from 'node:test'

import { createTestFundMarketData } from '../testing/createTestFundMarketData.ts'
import { mergeFundRefreshResult } from './mergeFundRefreshResult.ts'

test('refresh merge only replaces valid current requested funds and preserves stale data', () => {
  const oldA = createTestFundMarketData('161726')
  const oldB = createTestFundMarketData('161725')
  const freshA = { ...oldA, estimatedNav: 1.23, fetchedAt: 100 }
  const unexpected = { ...oldA, code: 'unexpected' }
  const result = mergeFundRefreshResult(
    { '161725': oldB, '161726': oldA },
    ['161726', '161725'],
    ['161726', '161725'],
    {
      fetchedAt: 100,
      issues: [{ code: 'missing-record', fundCode: '161725' }],
      source: 'network',
      marketData: [freshA, unexpected],
    },
  )
  assert.equal(result.updatedCount, 1)
  assert.equal(result.marketDataByCode['161726'], freshA)
  assert.equal(result.marketDataByCode['161725'], oldB)
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['missing-record', 'unexpected-record'],
  )
})

test('refresh merge ignores a fund deleted while the request was active', () => {
  const marketData = createTestFundMarketData('161726')
  const result = mergeFundRefreshResult({}, [], ['161726'], {
    fetchedAt: 100,
    issues: [],
    source: 'network',
    marketData: [marketData],
  })
  assert.equal(result.updatedCount, 0)
  assert.deepEqual(result.marketDataByCode, {})
})

test('refresh merge does not replace confirmed market data with older or unconfirmed data', () => {
  const current = {
    ...createTestFundMarketData('161726'),
    nav: 1.7,
    navDate: '2026-08-10',
  }
  const older = { ...current, nav: 1.4, navDate: '2026-08-07' }
  const unconfirmed = { ...current, estimatedNav: 1.8, nav: null, navDate: null }

  for (const incoming of [older, unconfirmed]) {
    const result = mergeFundRefreshResult({ '161726': current }, ['161726'], ['161726'], {
      fetchedAt: 100,
      issues: [],
      source: 'cache',
      marketData: [incoming],
    })
    assert.equal(result.updatedCount, 0)
    assert.equal(result.marketDataByCode['161726'], current)
  }
})
