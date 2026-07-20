import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexDefinition, IndexMarket } from '../models/indexDefinition.ts'
import { selectOpenMarketIndexDefinitions } from './selectOpenMarketIndexDefinitions.ts'

const definitions: readonly IndexDefinition[] = [
  { id: 'cn', market: 'cn', name: '内地', quoteCode: '1.000001', securityCode: '000001' },
  { id: 'hk', market: 'hk', name: '香港', quoteCode: '124.HSTECH', securityCode: 'HSTECH' },
  { id: 'us', market: 'us', name: '美国', quoteCode: '100.SPX', securityCode: 'SPX' },
]

test('selects only definitions from open markets in definition order', () => {
  const openMarkets = new Set<IndexMarket>(['hk', 'us'])

  assert.deepEqual(
    selectOpenMarketIndexDefinitions(definitions, openMarkets).map((definition) => definition.id),
    ['hk', 'us'],
  )
})

test('returns no definitions when all markets are closed', () => {
  assert.deepEqual(selectOpenMarketIndexDefinitions(definitions, new Set()), [])
})
