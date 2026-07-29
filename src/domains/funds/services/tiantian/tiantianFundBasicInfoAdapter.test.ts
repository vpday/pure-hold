import assert from 'node:assert/strict'
import test from 'node:test'

import { createTiantianFundBasicInfoRequestBody } from './createTiantianFundBasicInfoRequestBody.ts'
import { fetchTiantianFundBasicInfo } from './fetchTiantianFundBasicInfo.ts'
import { parseTiantianFundBasicInfoResponse } from './parseTiantianFundBasicInfoResponse.ts'

test('creates the fixed basic info form fields and a fresh UUID', () => {
  const first = createTiantianFundBasicInfoRequestBody('161725')
  const second = createTiantianFundBasicInfoRequestBody('161725')
  const fields = first.get('FIELDS') ?? ''

  assert.equal(first.get('FCODES'), '161725')
  assert.equal(first.get('plat'), 'Web')
  assert.equal(first.get('product'), 'EFund')
  assert.equal(first.get('version'), '6.8.3')
  assert.ok(fields.includes('FTYPE'))
  assert.ok(fields.includes('RLEVEL_SZ'))
  assert.ok(!fields.includes('FUNDTYPE'))
  assert.notEqual(first.get('deviceid'), second.get('deviceid'))
  assert.throws(() => createTiantianFundBasicInfoRequestBody('16172'), /exactly 6 digits/)
})

test('maps a valid record and normalizes strings and numeric fields', () => {
  const result = parseTiantianFundBasicInfoResponse(
    successful([
      {
        ENDNAV: '19740460005.96',
        ESTABDATE: ' 2015-05-27 ',
        FCODE: '161725',
        FEGMRQ: '2026-06-30',
        FTYPE: ' 指数型-股票 ',
        INDEXNAME: ' 中证白酒指数 ',
        JJGS: ' 招商基金 ',
        RISKLEVEL: '4',
        RLEVEL_CX: 5,
        RLEVEL_SZ: '3',
        TRKERROR: '0.0123',
      },
    ]),
    '161725',
  )

  assert.deepEqual(result, {
    code: '161725',
    companyName: '招商基金',
    establishedDate: '2015-05-27',
    fundType: '指数型-股票',
    morningstarRating: 5,
    netAssetsYuan: 19740460005.96,
    netAssetsDate: '2026-06-30',
    riskLevel: 4,
    shanghaiRating: 3,
    trackingError: 0.0123,
    trackingIndexName: '中证白酒指数',
  })
})

test('normalizes empty, invalid, out-of-range and negative values', () => {
  const result = parseTiantianFundBasicInfoResponse(
    successful([
      {
        ENDNAV: -1,
        ESTABDATE: ' ',
        FCODE: '161725',
        FTYPE: null,
        JJGS: 123,
        RISKLEVEL: 6,
        RLEVEL_CX: 0,
        RLEVEL_SZ: 2.5,
        TRKERROR: 'not-a-number',
      },
    ]),
    '161725',
  )

  assert.deepEqual(result, {
    code: '161725',
    companyName: null,
    establishedDate: null,
    fundType: null,
    morningstarRating: null,
    netAssetsYuan: null,
    netAssetsDate: null,
    riskLevel: null,
    shanghaiRating: null,
    trackingError: null,
    trackingIndexName: null,
  })
})

test('rejects unsuccessful, missing, mismatched, duplicated and malformed records', () => {
  for (const response of [
    { data: [], errorCode: 0, success: true },
    { data: [{}], errorCode: 1, success: false },
    successful([{ FCODE: '000001' }]),
    successful([{ FCODE: '161725' }, { FCODE: '161725' }]),
    successful([null]),
  ]) {
    assert.throws(() => parseTiantianFundBasicInfoResponse(response, '161725'))
  }
})

test('fetch uses the fixed endpoint and propagates request cancellation', async (context) => {
  const originalFetch = globalThis.fetch
  const controller = new AbortController()
  let requestedUrl = ''
  let requestedInit: RequestInit | undefined
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedInit = init
    throw new DOMException('aborted', 'AbortError')
  }
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  await assert.rejects(fetchTiantianFundBasicInfo('161725', controller.signal), {
    name: 'AbortError',
  })
  assert.equal(requestedUrl, 'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundBaseInfos')
  assert.equal(requestedInit?.method, 'POST')
  assert.equal(requestedInit?.signal, controller.signal)
  const headers = requestedInit?.headers as Record<string, string> | undefined
  assert.equal(headers?.['Content-Type'], 'application/x-www-form-urlencoded')
})

function successful(data: readonly unknown[]): unknown {
  return { data, errorCode: 0, success: true }
}
