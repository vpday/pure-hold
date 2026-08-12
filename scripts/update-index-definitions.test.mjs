import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeIndexDefinitions, parseIndexRankPage } from './update-index-definitions.mjs'

function record(overrides = {}) {
  return {
    SEC_NAME: '半导体,电子',
    SEC_CODE: 'BK000053,BK000054',
    TYPE_NAME: '行业',
    TYPE_CODE: '001002',
    INDEXCODE: '950125',
    INDEXNAME: '科创半导体材料设备',
    INDEXTYPE: '02',
    NEWINDEXTEXCH: '2',
    ISQUOT: '1',
    ...overrides,
  }
}

test('parses successful index rank pages', () => {
  const data = [record()]
  assert.equal(parseIndexRankPage({ data, errorCode: 0, success: true }), data)
  assert.throws(() => parseIndexRankPage({ data, errorCode: 1, success: false }))
})

test('keeps only string ISQUOT=1 and normalizes fields', () => {
  const definitions = normalizeIndexDefinitions([
    record(),
    record({ INDEXCODE: '000001', ISQUOT: '0' }),
    record({ INDEXCODE: '000002', ISQUOT: 1 }),
  ])

  assert.deepEqual(definitions, [
    {
      id: '2.950125',
      quoteCode: '2.950125',
      securityCode: '950125',
      name: '科创半导体材料设备',
      sectorNames: ['半导体', '电子'],
      sectorCodes: ['BK000053', 'BK000054'],
      typeName: '行业',
      typeCode: '001002',
      indexType: '02',
      quoteMarketCode: '2',
      refreshMarketCodes: ['SH', 'SZ'],
    },
  ])
})

test('maps special quote markets to Tencent refresh markets', () => {
  const definitions = normalizeIndexDefinitions([
    record({ INDEXCODE: 'AU9999', INDEXNAME: '黄金9999', NEWINDEXTEXCH: '118' }),
    record({ INDEXCODE: 'HSCEI', INDEXNAME: '恒生国企指数', NEWINDEXTEXCH: '100' }),
    record({ INDEXCODE: 'N225', INDEXNAME: '日经225', NEWINDEXTEXCH: '100' }),
  ])

  assert.deepEqual(
    Object.fromEntries(
      definitions.map((definition) => [definition.quoteCode, definition.refreshMarketCodes]),
    ),
    {
      '100.HSCEI': ['HK'],
      '100.N225': ['JW'],
      '118.AU9999': ['SQ'],
    },
  )
})

test('preserves nullable classification fields', () => {
  const [definition] = normalizeIndexDefinitions([
    record({
      SEC_NAME: null,
      SEC_CODE: null,
      TYPE_NAME: null,
      TYPE_CODE: null,
      INDEXTYPE: null,
    }),
  ])

  assert.equal(definition?.sectorNames, null)
  assert.equal(definition?.sectorCodes, null)
  assert.equal(definition?.typeName, null)
  assert.equal(definition?.typeCode, null)
  assert.equal(definition?.indexType, null)
})

test('keeps the first definition and warns on duplicate quote codes', () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args)

  try {
    const definitions = normalizeIndexDefinitions([
      record({ INDEXCODE: '399416', NEWINDEXTEXCH: '0', INDEXNAME: '首条名称' }),
      record({ INDEXCODE: '399416', NEWINDEXTEXCH: '0', INDEXNAME: '重复名称' }),
    ])

    assert.equal(definitions.length, 1)
    assert.equal(definitions[0]?.quoteCode, '0.399416')
    assert.equal(definitions[0]?.name, '首条名称')
    assert.equal(warnings.length, 1)
    assert.match(warnings[0]?.[0], /Duplicate quote code.*0\.399416/)
    assert.equal(warnings[0]?.[1]?.quoteCode, '0.399416')
  } finally {
    console.warn = originalWarn
  }
})

test('rejects mismatched sector lists', () => {
  assert.throws(
    () => normalizeIndexDefinitions([record({ SEC_CODE: 'BK000053' })]),
    /equal lengths/,
  )
})

test('rejects missing required fields', () => {
  assert.throws(() => normalizeIndexDefinitions([record({ NEWINDEXTEXCH: null })]), /NEWINDEXTEXCH/)
})
