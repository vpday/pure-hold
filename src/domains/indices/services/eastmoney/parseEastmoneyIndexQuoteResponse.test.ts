import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexDefinition } from '../../models/indexDefinition.ts'
import { mapEastmoneyIndexQuote } from './mapEastmoneyIndexQuote.ts'
import { parseEastmoneyIndexQuoteResponse } from './parseEastmoneyIndexQuoteResponse.ts'

const definition: IndexDefinition = {
  id: '124.HSTECH',
  quoteCode: '124.HSTECH',
  securityCode: 'HSTECH',
  name: '恒生科技',
  sectorNames: null,
  sectorCodes: null,
  typeName: '宽基',
  typeCode: '001001',
  indexType: '01',
  quoteMarketCode: '124',
  refreshMarketCodes: ['HK'],
}

const validRecord = {
  f2: 4987.36,
  f3: -2.37,
  f4: -121.12,
  f12: 'HSTECH',
  f13: 124,
  f14: '恒生科技指数',
  f124: 1784532259,
}

test('parses and maps an Eastmoney quote into a domain snapshot', () => {
  const parsed = parseEastmoneyIndexQuoteResponse({
    rc: 0,
    data: { diff: [validRecord] },
  })

  assert.equal(parsed.malformedRecordCount, 0)
  assert.equal(parsed.dtos.length, 1)
  assert.equal(parsed.dtos[0]?.quoteCode, '124.HSTECH')
  assert.deepEqual(mapEastmoneyIndexQuote(definition, parsed.dtos[0]!), {
    quote: {
      changeAmount: -121.12,
      changePercent: -2.37,
      indexId: '124.HSTECH',
      price: 4987.36,
      quotedAt: 1784532259000,
    },
  })
})

test('keeps market numbers when securities share the same code', () => {
  const parsed = parseEastmoneyIndexQuoteResponse({
    rc: 0,
    data: {
      diff: [
        { ...validRecord, f12: '000001', f13: 0 },
        { ...validRecord, f12: '000001', f13: 1 },
      ],
    },
  })

  assert.deepEqual(
    parsed.dtos.map((dto) => dto.quoteCode),
    ['0.000001', '1.000001'],
  )
})

test('reports malformed records without rejecting valid records', () => {
  const parsed = parseEastmoneyIndexQuoteResponse({
    rc: 0,
    data: { diff: [null, { f12: 'SPX' }, { ...validRecord, f12: '' }, validRecord] },
  })

  assert.equal(parsed.malformedRecordCount, 3)
  assert.equal(parsed.dtos.length, 1)
})

test('rejects unsuccessful or malformed Eastmoney responses', () => {
  assert.throws(() => parseEastmoneyIndexQuoteResponse({ rc: 1, data: { diff: [] } }))
  assert.throws(() => parseEastmoneyIndexQuoteResponse({ rc: 0, data: { diff: null } }))
})

test('rejects invalid quote values at the adapter seam', () => {
  const invalidCases = [
    [{ ...validRecord, f2: -1 }, 'invalid-price'],
    [{ ...validRecord, f3: 'not-a-number' }, 'invalid-change-percent'],
    [{ ...validRecord, f4: null }, 'invalid-change-amount'],
    [{ ...validRecord, f124: 0 }, 'invalid-quote-time'],
    [{ ...validRecord, f12: 'OTHER' }, 'security-code-mismatch'],
  ] as const

  for (const [record, expectedCode] of invalidCases) {
    const parsed = parseEastmoneyIndexQuoteResponse({ rc: 0, data: { diff: [record] } })
    assert.deepEqual(mapEastmoneyIndexQuote(definition, parsed.dtos[0]!), {
      issue: { code: expectedCode, indexId: definition.id },
    })
  }
})
