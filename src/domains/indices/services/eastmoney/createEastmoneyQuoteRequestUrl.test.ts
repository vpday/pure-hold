import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexDefinition } from '../../models/indexDefinition.ts'
import { createEastmoneyQuoteRequestUrl } from './createEastmoneyQuoteRequestUrl.ts'

const definitions: readonly IndexDefinition[] = [
  {
    id: 'sh000001',
    market: 'cn',
    name: '上证指数',
    quoteCode: '1.000001',
    securityCode: '000001',
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
