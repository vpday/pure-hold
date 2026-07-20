import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultIndexDefinitions } from './defaultIndexDefinitions.ts'
import { defaultIndexGroups } from './defaultIndexGroups.ts'

test('default index groups reference unique configured Eastmoney quote codes', () => {
  const definitionsByQuoteCode = new Map(
    defaultIndexDefinitions.map((definition) => [definition.quoteCode, definition]),
  )

  assert.equal(
    new Set(defaultIndexDefinitions.map((definition) => definition.id)).size,
    defaultIndexDefinitions.length,
  )
  assert.equal(definitionsByQuoteCode.size, defaultIndexDefinitions.length)

  for (const group of defaultIndexGroups) {
    for (const quoteCode of group.quoteCodes) {
      assert.ok(
        definitionsByQuoteCode.has(quoteCode),
        `${group.id} references missing quote code ${quoteCode}`,
      )
    }
  }
})

test('default index groups preserve the product order', () => {
  assert.deepEqual(
    defaultIndexGroups.map((group) => group.name),
    ['沪深京', '港股', '美股'],
  )
  assert.deepEqual(defaultIndexGroups[1]?.quoteCodes, ['100.HSCEI', '124.HSTECH'])
  assert.deepEqual(defaultIndexGroups[2]?.quoteCodes, ['100.SPX', '100.NDX100', '251.NDXTMC'])
})
