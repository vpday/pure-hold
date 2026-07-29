import assert from 'node:assert/strict'
import test from 'node:test'

import { createEastmoneyFundCumulativeReturnsRequestUrl } from './createEastmoneyFundCumulativeReturnsRequestUrl.ts'
import { fetchEastmoneyFundCumulativeReturns } from './fetchEastmoneyFundCumulativeReturns.ts'
import { parseEastmoneyFundCumulativeReturnsResponse } from './parseEastmoneyFundCumulativeReturnsResponse.ts'

test('creates cumulative return parameters with a fresh device id', () => {
  const first = createEastmoneyFundCumulativeReturnsRequestUrl('161725', '399997', 'y')
  const second = createEastmoneyFundCumulativeReturnsRequestUrl('161725', '399997', 'y')

  assert.equal(
    first.origin + first.pathname,
    'https://fundcomapi.eastmoney.com/mm/newCore/FundVPageAccV2',
  )
  assert.equal(first.searchParams.get('FCODE'), '161725')
  assert.equal(first.searchParams.get('INDEXCODE'), '399997')
  assert.equal(first.searchParams.get('POINTCOUNT'), '')
  assert.equal(first.searchParams.get('RANGE'), 'y')
  assert.equal(first.searchParams.get('plat'), 'Iphone')
  assert.equal(first.searchParams.get('product'), 'EFund')
  assert.equal(first.searchParams.get('startDate'), '')
  assert.equal(first.searchParams.get('version'), '6.8.4')
  assert.notEqual(first.searchParams.get('deviceid'), second.searchParams.get('deviceid'))
  assert.throws(
    () => createEastmoneyFundCumulativeReturnsRequestUrl('16172', '399997', 'y'),
    /exactly 6 digits/,
  )
  assert.throws(
    () => createEastmoneyFundCumulativeReturnsRequestUrl('161725', '39999x', 'y'),
    /exactly 6 digits/,
  )
})

test('maps, sorts and deduplicates cumulative return points while preserving holes', () => {
  const result = parseEastmoneyFundCumulativeReturnsResponse(
    successful(
      [
        { PDATE: '2026-07-29', YIELD: '127.43', INDEXYIELD: 104.35, FUNDTYPEYIELD: null },
        { PDATE: 'invalid', YIELD: '1' },
        { PDATE: '2026-02-29', YIELD: '1' },
        { PDATE: '2016-12-03', YIELD: null, INDEXYIELD: null, FUNDTYPEYIELD: null },
        { PDATE: '2026-07-29', YIELD: '128', INDEXYIELD: 'bad', FUNDTYPEYIELD: '' },
        { PDATE: '2015-05-27', YIELD: '0.0', INDEXYIELD: '0.00', FUNDTYPEYIELD: '0' },
      ],
      { MAXRETRA: '67.9365' },
    ),
    '161725',
    '399997',
    'ln',
  )

  assert.deepEqual(result, {
    fundCode: '161725',
    maximumDrawdownPercent: 67.9365,
    referenceIndexCode: '399997',
    range: 'ln',
    points: [
      {
        date: '2015-05-27',
        fundYieldPercent: 0,
        referenceIndexYieldPercent: 0,
        fundTypeYieldPercent: 0,
      },
      {
        date: '2016-12-03',
        fundYieldPercent: null,
        referenceIndexYieldPercent: null,
        fundTypeYieldPercent: null,
      },
      {
        date: '2026-07-29',
        fundYieldPercent: 128,
        referenceIndexYieldPercent: null,
        fundTypeYieldPercent: null,
      },
    ],
  })
})

test('normalizes missing, invalid and negative maximum drawdown values', () => {
  for (const expansion of [undefined, null, {}, { MAXRETRA: 'bad' }, { MAXRETRA: -1 }]) {
    const result = parseEastmoneyFundCumulativeReturnsResponse(
      successful([{ PDATE: '2026-07-29', YIELD: 1 }], expansion),
      '161725',
      '399997',
      'y',
    )
    assert.equal(result.maximumDrawdownPercent, null)
  }
})

test('rejects unsuccessful, malformed and empty cumulative return responses', () => {
  for (const response of [
    { data: [], errorCode: 1, success: false },
    { data: null, errorCode: 0, success: true },
    successful([]),
    successful([{ PDATE: 'not-a-date', YIELD: 1 }]),
  ]) {
    assert.throws(() =>
      parseEastmoneyFundCumulativeReturnsResponse(response, '161725', '399997', 'y'),
    )
  }
})

test('fetch rejects HTTP failures and propagates caller cancellation', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(fetchEastmoneyFundCumulativeReturns('161725', '399997', 'y'), {
    message: '累计收益服务暂时不可用',
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
  const request = fetchEastmoneyFundCumulativeReturns('161725', '399997', 'y', controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
  assert.equal(requestedSignal, controller.signal)
})

function successful(data: readonly unknown[], expansion?: unknown): unknown {
  return { data, errorCode: 0, expansion, success: true }
}
