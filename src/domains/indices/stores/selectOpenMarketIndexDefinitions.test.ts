import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexDefinition } from '../models/indexDefinition.ts'
import { selectOpenMarketIndexDefinitions } from './selectOpenMarketIndexDefinitions.ts'

const definitions: readonly IndexDefinition[] = [
  definition('1.000001', '内地'),
  definition('124.HSTECH', '香港'),
  definition('100.SPX', '美国'),
]
test('selects only definitions with an open refresh market in definition order', () => {
  assert.deepEqual(
    selectOpenMarketIndexDefinitions(definitions, new Set(['HK', 'US'])).map((item) => item.id),
    ['124.HSTECH', '100.SPX'],
  )
})

test('returns no definitions when all configured markets are closed', () => {
  assert.deepEqual(selectOpenMarketIndexDefinitions(definitions, new Set()), [])
})

function definition(quoteCode: string, name: string): IndexDefinition {
  const [quoteMarketCode = '', securityCode = ''] = quoteCode.split('.')
  return {
    id: quoteCode,
    quoteCode,
    securityCode,
    name,
    sectorNames: null,
    sectorCodes: null,
    typeName: null,
    typeCode: null,
    indexType: null,
    quoteMarketCode,
    refreshMarketCodes:
      quoteCode === '1.000001' ? ['SH'] : quoteCode === '124.HSTECH' ? ['HK'] : ['US'],
  }
}
