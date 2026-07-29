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
  for (const field of [
    'DRAWCFMDATA',
    'MAXSG',
    'MGREXP',
    'MINSG',
    'RATE',
    'RDMCFMDATA',
    'SALESEXP',
    'SGZT',
    'SHZT',
    'SOURCERATE',
    'SSBCFMDATA',
    'TRUSTEXP',
  ]) {
    assert.ok(fields.split(',').includes(field), `missing ${field}`)
  }
  assert.ok(fields.split(',').includes('FTYPE'))
  assert.ok(fields.split(',').includes('ISBUY'))
  assert.ok(fields.split(',').includes('RLEVEL_SZ'))
  assert.ok(!fields.includes('FUNDTYPE'))
  assert.notEqual(first.get('deviceid'), second.get('deviceid'))
  assert.throws(() => createTiantianFundBasicInfoRequestBody('16172'), /exactly 6 digits/)
})

test('maps a valid record and normalizes strings and numeric fields', () => {
  const result = parseTiantianFundBasicInfoResponse(
    successful([
      {
        DRAWCFMDATA: 3,
        ENDNAV: '19740460005.96',
        ESTABDATE: ' 2015-05-27 ',
        FCODE: '161725',
        FEGMRQ: '2026-06-30',
        FTYPE: ' 指数型-股票 ',
        INDEXNAME: ' 中证白酒指数 ',
        JJGS: ' 招商基金 ',
        MAXSG: 500000,
        MGREXP: '1',
        MINSG: '10',
        RATE: '0.10%',
        RDMCFMDATA: '1',
        RISKLEVEL: '4',
        RLEVEL_CX: 5,
        RLEVEL_SZ: '3',
        SALESEXP: '0.00%',
        SGZT: ' 限大额 ',
        SHZT: ' 开放赎回 ',
        SOURCERATE: '1.00%',
        SSBCFMDATA: 1.0,
        TRKERROR: '0.0123',
        TRUSTEXP: 0.2,
      },
    ]),
    '161725',
  )

  assert.deepEqual(result, {
    code: '161725',
    companyName: '招商基金',
    custodyFeePercent: 0.2,
    dailyPurchaseLimitYuan: 500000,
    establishedDate: '2015-05-27',
    fundType: '指数型-股票',
    managementFeePercent: 1,
    minimumPurchaseAmountYuan: 10,
    morningstarRating: 5,
    netAssetsYuan: 19740460005.96,
    netAssetsDate: '2026-06-30',
    purchaseConfirmationDays: 1,
    purchaseFeePercent: 0.1,
    purchaseStatus: '限大额',
    redemptionConfirmationDays: 1,
    redemptionFundsArrivalDays: 3,
    redemptionStatus: '开放赎回',
    riskLevel: 4,
    salesServiceFeePercent: 0,
    shanghaiRating: 3,
    standardPurchaseFeePercent: 1,
    trackingError: 0.0123,
    trackingIndexName: '中证白酒指数',
  })
  assert.equal(Object.hasOwn(result, 'isBuy'), false)
})

test('normalizes empty, invalid, out-of-range and negative values', () => {
  const result = parseTiantianFundBasicInfoResponse(
    successful([
      {
        DRAWCFMDATA: 'not-a-number',
        ENDNAV: -1,
        ESTABDATE: ' ',
        FCODE: '161725',
        FTYPE: null,
        JJGS: 123,
        MAXSG: 0,
        MGREXP: 'Infinity',
        MINSG: -1,
        RATE: '-0.1%',
        RDMCFMDATA: -1,
        RISKLEVEL: 6,
        RLEVEL_CX: 0,
        RLEVEL_SZ: 2.5,
        SALESEXP: false,
        SGZT: 1,
        SHZT: ' ',
        SOURCERATE: '1% fee',
        SSBCFMDATA: 1.5,
        TRKERROR: 'not-a-number',
        TRUSTEXP: '1%%',
      },
    ]),
    '161725',
  )

  assert.deepEqual(result, {
    code: '161725',
    companyName: null,
    custodyFeePercent: null,
    dailyPurchaseLimitYuan: null,
    establishedDate: null,
    fundType: null,
    managementFeePercent: null,
    minimumPurchaseAmountYuan: null,
    morningstarRating: null,
    netAssetsYuan: null,
    netAssetsDate: null,
    purchaseConfirmationDays: null,
    purchaseFeePercent: null,
    purchaseStatus: null,
    redemptionConfirmationDays: null,
    redemptionFundsArrivalDays: null,
    redemptionStatus: null,
    riskLevel: null,
    salesServiceFeePercent: null,
    shanghaiRating: null,
    standardPurchaseFeePercent: null,
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
