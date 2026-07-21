import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexDefinition } from '../../models/indexDefinition.ts'
import { createEastmoneyQuoteRequestUrl } from './createEastmoneyQuoteRequestUrl.ts'

const definitions: readonly IndexDefinition[] = [
  {
    id: '1.000001',
    quoteCode: '1.000001',
    securityCode: '000001',
    name: '上证指数',
    sectorNames: ['规模'],
    sectorCodes: ['BK000002'],
    typeName: '宽基',
    typeCode: '001001',
    indexType: '01',
    quoteMarketCode: '1',
    refreshMarketCodes: ['SH'],
  },
]

test('creates a fresh UUID v4 device id for every Eastmoney quote request', () => {
  const firstDeviceId = createEastmoneyQuoteRequestUrl(definitions).searchParams.get('deviceid')
  const secondDeviceId = createEastmoneyQuoteRequestUrl(definitions).searchParams.get('deviceid')
  const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  assert.match(firstDeviceId ?? '', uuidV4Pattern)
  assert.match(secondDeviceId ?? '', uuidV4Pattern)
  assert.notEqual(firstDeviceId, secondDeviceId)
})
