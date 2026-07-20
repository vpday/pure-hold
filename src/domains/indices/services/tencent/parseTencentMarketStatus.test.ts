import assert from 'node:assert/strict'
import test from 'node:test'

import { parseTencentMarketStatus } from './parseTencentMarketStatus.ts'

const marketStatusResponse =
  'v_marketStat="2026-07-20 15:24:19|HK_open_交易中|SH_close_已收盘|SZ_close_已收盘|US_close_未开盘|NEWSH_close_已收盘|NEWHK_open_交易中|NEWUS_close_未开盘|KCB_open_盘后交易中|CYB_open_盘后交易中";'

test('maps only open primary Tencent markets', () => {
  assert.deepEqual([...parseTencentMarketStatus(marketStatusResponse)], ['hk'])
})

test('maps either mainland exchange and the primary US market', () => {
  const response =
    'v_marketStat="2026-07-20 09:35:00|SH_open_交易中|SZ_close_已收盘|HK_close_已收盘|US_open_交易中";'

  assert.deepEqual([...parseTencentMarketStatus(response)], ['cn', 'us'])
})

test('returns no markets when all primary markets are closed', () => {
  const response =
    'v_marketStat="2026-07-20 18:00:00|SH_close_已收盘|SZ_close_已收盘|HK_close_已收盘|US_close_未开盘";'

  assert.deepEqual([...parseTencentMarketStatus(response)], [])
})

test('rejects malformed Tencent market status responses', () => {
  assert.throws(() => parseTencentMarketStatus(''))
  assert.throws(() => parseTencentMarketStatus('v_marketStat="invalid";'))
  assert.throws(() => parseTencentMarketStatus('SH_open_交易中'))
})
