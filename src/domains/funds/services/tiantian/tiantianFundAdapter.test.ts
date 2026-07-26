import assert from 'node:assert/strict'
import test from 'node:test'

import { createTiantianFundRequestBody } from './createTiantianFundRequestBody.ts'
import { parseTiantianFundResponse } from './parseTiantianFundResponse.ts'

test('creates fixed Tiantian form fields and a fresh UUID for each request', () => {
  const first = createTiantianFundRequestBody(['161726', '161725'])
  const second = createTiantianFundRequestBody(['161726', '161725'])
  assert.equal(first.get('APPID'), 'FAVOR,FAVOR_ED')
  assert.equal(first.get('CODES'), '161726,161725')
  assert.match(first.toString(), /CODES=161726%2C161725/)
  assert.equal(first.get('pageIndex'), '1')
  assert.equal(first.get('pageSize'), '50')
  assert.equal(first.get('plat'), 'Iphone')
  assert.equal(first.get('product'), 'EFund')
  assert.equal(first.get('version'), '6.8.1')
  assert.notEqual(first.get('deviceid'), second.get('deviceid'))
  assert.throws(() => createTiantianFundRequestBody([]), /1 to 50/)
  assert.throws(() => createTiantianFundRequestBody(Array.from({ length: 51 }, (_, i) => `${i}`)))
})

test('maps valid records, nullable values, tags and all return periods', () => {
  const result = parseTiantianFundResponse(
    successful([
      {
        FCODE: '161726',
        GZTIME: '2026-07-25 15:00',
        GSZ: '1.2345',
        GSZZL: '2.5',
        LABELINFO: {
          FAVOR: [
            { FEANAME: '近6月新低', FEAORDER: 3 },
            { FEANAME: ' 近1年新低 ', FEAORDER: 1 },
          ],
          FAVOR_ED: [
            { FEANAME: ' 日限额10元 ' },
            { FEANAME: '暂停申购' },
            { FEANAME: '日限额10元' },
          ],
          FAVOR_GS: [{ FEANAME: '应被忽略' }],
        },
        NAV: '',
        NAVCHGRT: null,
        PDATE: '2026-07-25',
        SHORTNAME: '基金 A',
        SYL_1N: '10',
        SYL_2N: '20',
        SYL_3N: '30',
        SYL_3Y: '3',
        SYL_5N: '50',
        SYL_6Y: '6',
        SYL_JN: '7',
        SYL_LN: '100',
        SYL_Y: '1',
        SYL_Z: '0.5',
        SYRQ: '2026-07-25',
      },
    ]),
    ['161726'],
    123,
  )
  assert.deepEqual(result.issues, [])
  assert.deepEqual(result.snapshots[0], {
    code: '161726',
    dailyChangePercent: null,
    estimatedAt: '2026-07-25 15:00',
    estimatedChangePercent: 2.5,
    estimatedNav: 1.2345,
    fetchedAt: 123,
    name: '基金 A',
    nav: null,
    navDate: '2026-07-25',
    returns: {
      fiveYears: 50,
      oneMonth: 1,
      oneWeek: 0.5,
      oneYear: 10,
      sinceInception: 100,
      sixMonths: 6,
      threeMonths: 3,
      threeYears: 30,
      twoYears: 20,
      yearToDate: 7,
    },
    returnsDate: '2026-07-25',
    tags: ['近1年新低', '日限额10元', '暂停申购'],
  })
})

test('keeps valid records when another record is malformed or unexpected', () => {
  const result = parseTiantianFundResponse(
    successful([
      { FCODE: '161726', SHORTNAME: '基金 A' },
      { FCODE: '161725', SHORTNAME: '' },
      { FCODE: 'unexpected', SHORTNAME: '额外基金' },
    ]),
    ['161726', '161725'],
    123,
  )
  assert.deepEqual(
    result.snapshots.map((item) => item.code),
    ['161726'],
  )
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['malformed-record', 'unexpected-record', 'missing-record'],
  )
})

test('rejects unsuccessful and malformed top-level responses', () => {
  for (const response of [
    { data: [], errorCode: 1, success: false, totalCount: 0 },
    { data: {}, errorCode: 0, success: true, totalCount: 0 },
    { data: [], errorCode: 0, success: true, totalCount: -1 },
  ]) {
    const result = parseTiantianFundResponse(response, ['161726'], 123)
    assert.deepEqual(result.snapshots, [])
    assert.deepEqual(result.issues, [{ code: 'business-response-failed', fundCode: '161726' }])
  }
})

function successful(data: readonly unknown[]): unknown {
  return { data, errorCode: 0, success: true, totalCount: data.length }
}
