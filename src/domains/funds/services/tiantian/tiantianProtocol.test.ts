import assert from 'node:assert/strict'
import test from 'node:test'

import { createTiantianRequestParams } from './createTiantianRequestParams.ts'
import { isSuccessfulTiantianResponse } from './tiantianResponse.ts'

test('creates canonical request parameters with a fresh device id', () => {
  const first = createTiantianRequestParams({
    FCODE: '161725',
    deviceid: 'caller-device',
    plat: 'Iphone',
    product: 'caller-product',
    version: 'caller-version',
  })
  const second = createTiantianRequestParams({ FCODE: '161725' })

  assert.equal(first.get('FCODE'), '161725')
  assert.equal(first.get('plat'), 'Web')
  assert.equal(first.get('product'), 'EFund')
  assert.equal(first.get('version'), '6.5.5')
  assert.match(first.get('deviceid') ?? '', /^[0-9a-f-]{36}$/i)
  assert.notEqual(first.get('deviceid'), 'caller-device')
  assert.notEqual(first.get('deviceid'), second.get('deviceid'))
})

test('recognizes only successful Tiantian response envelopes with own data', () => {
  assert.equal(isSuccessfulTiantianResponse({ data: [], errorCode: 0, success: true }), true)
  assert.equal(isSuccessfulTiantianResponse({ data: {}, errorCode: 0, success: true }), true)
  assert.equal(isSuccessfulTiantianResponse({ data: undefined, errorCode: 0, success: true }), true)

  const inheritedData = Object.create({ data: [] }) as Record<string, unknown>
  inheritedData.errorCode = 0
  inheritedData.success = true
  for (const value of [
    inheritedData,
    { errorCode: 0, success: true },
    { data: [], errorCode: 1, success: true },
    { data: [], errorCode: 0, success: false },
    null,
    [],
  ]) {
    assert.equal(isSuccessfulTiantianResponse(value), false)
  }
})
