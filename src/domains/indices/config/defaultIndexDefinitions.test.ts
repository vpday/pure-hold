import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultIndexDefinitions } from './defaultIndexDefinitions.ts'
import { defaultIndexGroups } from './defaultIndexGroups.ts'

test('default index catalog preserves generated data invariants', () => {
  const quoteCodes = defaultIndexDefinitions.map((definition) => definition.quoteCode)

  assert.ok(defaultIndexDefinitions.length > 0)
  assert.equal(
    new Set(defaultIndexDefinitions.map((definition) => definition.id)).size,
    defaultIndexDefinitions.length,
  )
  assert.equal(new Set(quoteCodes).size, defaultIndexDefinitions.length)

  for (const definition of defaultIndexDefinitions) {
    assert.equal(definition.id, definition.quoteCode)
    assert.equal(definition.quoteCode, `${definition.quoteMarketCode}.${definition.securityCode}`)
    assert.ok(definition.name.length > 0)
    assert.ok(definition.refreshMarketCodes.length > 0)
    assert.ok(definition.refreshMarketCodes.every((value) => value.length > 0))
    assert.equal(definition.sectorNames === null, definition.sectorCodes === null)
    if (definition.sectorNames && definition.sectorCodes) {
      assert.equal(definition.sectorNames.length, definition.sectorCodes.length)
      assert.ok(definition.sectorNames.every((value) => value.length > 0))
      assert.ok(definition.sectorCodes.every((value) => value.length > 0))
    }
  }
})

test('default groups reference 18 unique catalog entries with refresh mappings', () => {
  const definitionsByQuoteCode = new Map(
    defaultIndexDefinitions.map((definition) => [definition.quoteCode, definition]),
  )
  const groupQuoteCodes = defaultIndexGroups.flatMap((group) => [...group.quoteCodes])

  assert.equal(groupQuoteCodes.length, 18)
  assert.equal(new Set(groupQuoteCodes).size, 18)

  for (const quoteCode of groupQuoteCodes) {
    assert.ok(definitionsByQuoteCode.has(quoteCode), `missing catalog entry ${quoteCode}`)
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
