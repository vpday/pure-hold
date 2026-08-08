import assert from 'node:assert/strict'
import test from 'node:test'

import { createTiantianFundAssetAllocationRequestUrl } from './createTiantianFundAssetAllocationRequestUrl.ts'
import { fetchTiantianFundAssetAllocation } from './fetchTiantianFundAssetAllocation.ts'
import { parseTiantianFundAssetAllocationResponse } from './parseTiantianFundAssetAllocationResponse.ts'

test('creates asset allocation parameters with a fresh device id', () => {
  const first = createTiantianFundAssetAllocationRequestUrl('161725')
  const second = createTiantianFundAssetAllocationRequestUrl('161725')

  assert.equal(
    first.origin + first.pathname,
    'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundAssetAllocationTop',
  )
  assert.equal(first.searchParams.get('FCODE'), '161725')
  assert.equal(first.searchParams.get('top'), '20')
  assert.equal(first.searchParams.get('plat'), 'Web')
  assert.equal(first.searchParams.get('product'), 'EFund')
  assert.equal(first.searchParams.get('version'), '6.5.5')
  assert.equal(first.searchParams.get('deviceid'), second.searchParams.get('deviceid'))
  assert.throws(() => createTiantianFundAssetAllocationRequestUrl('16172'), /exactly 6 digits/)
  assert.throws(() => createTiantianFundAssetAllocationRequestUrl('16172x'), /exactly 6 digits/)
})

test('maps, sorts and deduplicates asset allocation points', () => {
  const result = parseTiantianFundAssetAllocationResponse(
    successful([
      {
        BZDM: '161725',
        FSRQ: '2026-06-30',
        GP: '94.62',
        HB: '5.73',
        JJ: 'ignored',
        JZC: '402.2078',
        QT: 'ignored',
        ZQ: '0.0',
      },
      { BZDM: '161725', FSRQ: '2025-12-31', GP: '82.1', JZC: 350 },
      { BZDM: '161725', FSRQ: '2025-12-31', GP: '105.5', HB: 0, ZQ: 2 },
    ]),
    '161725',
  )

  assert.deepEqual(result, {
    fundCode: '161725',
    points: [
      {
        bondPercent: 2,
        cashPercent: 0,
        date: '2025-12-31',
        netAssetValue: null,
        stockPercent: 105.5,
      },
      {
        bondPercent: 0,
        cashPercent: 5.73,
        date: '2026-06-30',
        netAssetValue: 402.2078,
        stockPercent: 94.62,
      },
    ],
  })
})

test('normalizes invalid values and skips malformed or mismatched records', () => {
  const result = parseTiantianFundAssetAllocationResponse(
    successful([
      null,
      { FSRQ: 'invalid', GP: 1 },
      { FSRQ: '2026-02-29', GP: 1 },
      { BZDM: '000001', FSRQ: '2026-03-31', GP: 1 },
      { BZDM: '', FSRQ: '2026-03-31', GP: -1, HB: true, JZC: 'bad', ZQ: '2.5' },
      { FSRQ: '2026-06-30', GP: '', HB: -1, JZC: Number.POSITIVE_INFINITY, ZQ: NaN },
    ]),
    '161725',
  )

  assert.deepEqual(result.points, [
    {
      bondPercent: 2.5,
      cashPercent: null,
      date: '2026-03-31',
      netAssetValue: null,
      stockPercent: null,
    },
  ])
})

test('rejects unsuccessful, malformed and wholly invalid asset allocation responses', () => {
  for (const response of [
    { data: [], errorCode: 1, success: false },
    { data: null, errorCode: 0, success: true },
    successful([]),
    successful([{ FSRQ: 'invalid', GP: 1 }]),
    successful([{ FSRQ: '2026-06-30', GP: '', HB: null, JZC: -1, ZQ: false }]),
  ]) {
    assert.throws(
      () => parseTiantianFundAssetAllocationResponse(response, '161725'),
      /基金资产配置数据为空或无效/,
    )
  }
})

test('fetch reports HTTP status and propagates caller cancellation', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(fetchTiantianFundAssetAllocation('161725'), {
    message: '资产配置服务请求失败 (503)',
  })

  const controller = new AbortController()
  let requestedSignal: AbortSignal | null | undefined
  globalThis.fetch = async (_input, init) => {
    requestedSignal = init?.signal
    return await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('aborted', 'AbortError')),
        { once: true },
      )
    })
  }
  const request = fetchTiantianFundAssetAllocation('161725', controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
  assert.equal(requestedSignal, controller.signal)
})

function successful(data: readonly unknown[]): unknown {
  return { data, errorCode: 0, success: true }
}
