import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexDefinition } from '../models/indexDefinition.ts'
import { selectActiveIndexDefinitions } from './selectActiveIndexDefinitions.ts'

const definitions = [definition('1.A'), definition('1.B'), definition('1.C')]

test('selects grouped definitions once in first-reference order', () => {
  const selected = selectActiveIndexDefinitions(definitions, [
    { id: 'first', name: '第一组', quoteCodes: ['1.B', '1.MISSING', '1.A'] },
    { id: 'second', name: '第二组', quoteCodes: ['1.B', '1.C'] },
  ])

  assert.deepEqual(
    selected.map((item) => item.quoteCode),
    ['1.B', '1.A', '1.C'],
  )
})

function definition(quoteCode: string): IndexDefinition {
  const [quoteMarketCode = '', securityCode = ''] = quoteCode.split('.')
  return {
    id: quoteCode,
    quoteCode,
    securityCode,
    name: quoteCode,
    sectorNames: null,
    sectorCodes: null,
    typeName: null,
    typeCode: null,
    indexType: null,
    quoteMarketCode,
    refreshMarketCodes: ['SH'],
  }
}
