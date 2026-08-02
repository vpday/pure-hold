import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCsindexPerformanceRequestUrl,
  formatShanghaiDate,
} from './createCsindexPerformanceRequestUrl.ts'

test('creates the fixed H00300 full-history proxy request', () => {
  const url = createCsindexPerformanceRequestUrl('20260801')

  assert.equal(
    url.origin + url.pathname,
    'https://seep.eu.org/www.csindex.com.cn/csindex-home/perf/index-perf',
  )
  assert.deepEqual([...url.searchParams.keys()].sort(), ['endDate', 'indexCode', 'startDate'])
  assert.equal(url.searchParams.get('indexCode'), 'H00300')
  assert.equal(url.searchParams.get('startDate'), '20041231')
  assert.equal(url.searchParams.get('endDate'), '20260801')
})

test('rejects impossible or out-of-range end dates', () => {
  for (const value of ['2026-08-01', '20260229', '20041230']) {
    assert.throws(() => createCsindexPerformanceRequestUrl(value), /end date is invalid/)
  }
})

test('formats the request date in Asia Shanghai across a UTC boundary', () => {
  assert.equal(formatShanghaiDate(new Date('2026-07-31T15:59:59Z')), '20260731')
  assert.equal(formatShanghaiDate(new Date('2026-07-31T16:00:00Z')), '20260801')
})
