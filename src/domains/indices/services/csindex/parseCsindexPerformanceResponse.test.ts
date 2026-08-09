import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCsindexPerformanceResponse } from './parseCsindexPerformanceResponse.ts'

const first = record('20041231', 1000)

test('maps, sorts and deduplicates H00300 total-return points', () => {
  const result = parseCsindexPerformanceResponse(
    successful([
      record('20050105', 992.56),
      first,
      record('20050104', 980),
      record('20050104', '982.79'),
    ]),
    '20260801',
  )

  assert.deepEqual(result, {
    endDate: '20260801',
    indexCode: 'H00300',
    indexName: '沪深300全收益指数',
    issues: [{ code: 'duplicate-date', count: 1 }],
    points: [
      { date: '2004-12-31', value: 1000 },
      { date: '2005-01-04', value: 980 },
      { date: '2005-01-05', value: 992.56 },
    ],
    startDate: '20041231',
  })
})

test('keeps valid points and reports malformed records and a missing start date', () => {
  const result = parseCsindexPerformanceResponse(
    successful([null, record('invalid', 1), record('20050104', -1), record('20050105', 992.56)]),
    '20260801',
  )

  assert.deepEqual(result.issues, [
    { code: 'malformed-record', count: 3 },
    { code: 'missing-start-date', count: 1 },
  ])
  assert.deepEqual(result.points, [{ date: '2005-01-05', value: 992.56 }])
})

test('rejects unsuccessful, wrong-index and empty responses', () => {
  for (const response of [
    { code: '500', data: [], success: false },
    { code: '200', data: null, success: true },
    successful([]),
    successful([{ ...first, indexCode: '000300' }]),
    successful([{ ...first, indexNameCnAll: '沪深300指数' }]),
  ]) {
    assert.throws(() => parseCsindexPerformanceResponse(response, '20260801'))
  }
})

function successful(data: readonly unknown[]): unknown {
  return { code: '200', data, msg: 'Success', success: true }
}

function record(tradeDate: string, close: number | string): Record<string, unknown> {
  return {
    close,
    indexCode: 'H00300',
    indexNameCnAll: '沪深300全收益指数',
    tradeDate,
  }
}
