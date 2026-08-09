import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundHistoryRange } from '../../models/fundHistoryRange.ts'
import { createTiantianFundNetValueHistoryRequestUrl } from './createTiantianFundNetValueHistoryRequestUrl.ts'
import { fetchTiantianFundNetValueHistory } from './fetchTiantianFundNetValueHistory.ts'
import { parseTiantianFundNetValueHistoryResponse } from './parseTiantianFundNetValueHistoryResponse.ts'

test('creates exact net value history parameters with a fresh device id', () => {
  const first = createTiantianFundNetValueHistoryRequestUrl('161725', 'ln')
  const second = createTiantianFundNetValueHistoryRequestUrl('161725', 'ln')

  assert.equal(
    first.origin + first.pathname,
    'https://fundcomapi.tiantianfunds.com/mm/newCore/FundVPageDiagramNew',
  )
  assert.deepEqual([...first.searchParams.keys()].sort(), [
    'FCODE',
    'POINTCOUNT',
    'RANGE',
    'deviceid',
    'plat',
    'product',
    'version',
  ])
  assert.equal(first.searchParams.get('FCODE'), '161725')
  assert.equal(first.searchParams.get('POINTCOUNT'), '')
  assert.equal(first.searchParams.get('RANGE'), 'ln')
  assert.equal(first.searchParams.get('plat'), 'Web')
  assert.equal(first.searchParams.get('product'), 'EFund')
  assert.equal(first.searchParams.get('version'), '6.5.5')
  assert.match(first.searchParams.get('deviceid') ?? '', /^[0-9a-f-]{36}$/i)
  assert.equal(first.searchParams.get('deviceid'), second.searchParams.get('deviceid'))
  assert.throws(() => createTiantianFundNetValueHistoryRequestUrl('16172', 'ln'), /6 digits/)
  assert.throws(
    () => createTiantianFundNetValueHistoryRequestUrl('161725', 'invalid' as FundHistoryRange),
    /range is invalid/,
  )
})

test('maps, sorts and deduplicates net value points while preserving holes', () => {
  const result = parseTiantianFundNetValueHistoryResponse(
    successful([
      {
        FSRQ: '2026-07-29',
        DWJZ: '0.5623',
        JZZZL: '0.9',
        LJJZ: '2.2784',
        NAVTYPE: '1',
        RATE: '--',
      },
      { FSRQ: 'invalid', DWJZ: 1 },
      { FSRQ: '2026-02-29', DWJZ: 1 },
      { FSRQ: '2026-07-28', DWJZ: null, JZZZL: undefined, LJJZ: '' },
      { FSRQ: '2026-07-29', DWJZ: 0.6, JZZZL: -1.25, LJJZ: 'bad' },
      { FSRQ: '2026-07-27', DWJZ: true, JZZZL: Number.POSITIVE_INFINITY, LJJZ: 2 },
    ]),
    '161725',
    'ln',
  )

  assert.deepEqual(result, {
    events: [],
    fundCode: '161725',
    range: 'ln',
    points: [
      {
        cumulativeNetValue: 2,
        dailyGrowthPercent: null,
        date: '2026-07-27',
        unitNetValue: null,
      },
      {
        cumulativeNetValue: null,
        dailyGrowthPercent: null,
        date: '2026-07-28',
        unitNetValue: null,
      },
      {
        cumulativeNetValue: 2.2784,
        dailyGrowthPercent: 0.9,
        date: '2026-07-29',
        unitNetValue: 0.5623,
      },
    ],
  })
})

test('maps supported history events and ignores unknown or malformed entries', () => {
  const result = parseTiantianFundNetValueHistoryResponse(
    successful(
      [{ FSRQ: '2026-07-29', DWJZ: 1, LJJZ: 2 }],
      [
        { FSRQ: '2026-07-29', STYPE: '100', BONUS: '0.1' },
        { FSRQ: '2026-07-29', STYPE: 2 },
        { FSRQ: '2026-07-29', STYPE: '100' },
        { FSRQ: '2026-07-29', STYPE: '11' },
        { FSRQ: 'invalid', STYPE: '2' },
        null,
      ],
    ),
    '161725',
    'ln',
  )

  assert.deepEqual(result.events, [
    { date: '2026-07-29', type: 'dividend' },
    { date: '2026-07-29', type: 'manager-change' },
  ])
})

test('normalizes each invalid numeric field independently', () => {
  const result = parseTiantianFundNetValueHistoryResponse(
    successful([{ FSRQ: '2024-02-29', DWJZ: '1.2345', LJJZ: false, JZZZL: '2.5' }]),
    '161725',
    'y',
  )
  assert.deepEqual(result.points[0], {
    cumulativeNetValue: null,
    dailyGrowthPercent: 2.5,
    date: '2024-02-29',
    unitNetValue: 1.2345,
  })
})

test('rejects unsuccessful, malformed and empty net value history responses', () => {
  for (const response of [
    { data: [], errorCode: 1, success: false },
    { data: null, errorCode: 0, success: true },
    successful([]),
    successful([{ FSRQ: 'not-a-date', DWJZ: 1 }]),
  ]) {
    assert.throws(() => parseTiantianFundNetValueHistoryResponse(response, '161725', 'y'))
  }
})

test('fetch rejects HTTP failures and propagates caller cancellation', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(fetchTiantianFundNetValueHistory('161725', 'y'), {
    message: '基金净值历史服务暂时不可用',
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
  const request = fetchTiantianFundNetValueHistory('161725', 'y', controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
  assert.equal(requestedSignal, controller.signal)
})

function successful(data: readonly unknown[], expansion: unknown = []): unknown {
  return { data, errorCode: 0, expansion, success: true, totalCount: data.length }
}
