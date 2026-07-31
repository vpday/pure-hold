import assert from 'node:assert/strict'
import test from 'node:test'

import { createTiantianFundDistributionRequestUrl } from './createTiantianFundDistributionRequestUrl.ts'
import { fetchTiantianFundDistribution } from './fetchTiantianFundDistribution.ts'
import { parseTiantianFundDistributionResponse } from './parseTiantianFundDistributionResponse.ts'

test('creates exact distribution parameters with a fresh device id', () => {
  const first = createTiantianFundDistributionRequestUrl('161725')
  const second = createTiantianFundDistributionRequestUrl('161725')

  assert.equal(
    first.origin + first.pathname,
    'https://fundcomapi.tiantianfunds.com/mm/FundMNewApi/FundBonusDetail',
  )
  assert.deepEqual([...first.searchParams.keys()].sort(), [
    'FCODE',
    'deviceid',
    'plat',
    'product',
    'version',
  ])
  assert.equal(first.searchParams.get('FCODE'), '161725')
  assert.equal(first.searchParams.get('plat'), 'Iphone')
  assert.equal(first.searchParams.get('product'), 'EFund')
  assert.equal(first.searchParams.get('version'), '6.8.11')
  assert.match(first.searchParams.get('deviceid') ?? '', /^[0-9a-f-]{36}$/i)
  assert.notEqual(first.searchParams.get('deviceid'), second.searchParams.get('deviceid'))
  assert.throws(() => createTiantianFundDistributionRequestUrl('16172'), /6 digits/)
})

test('classifies merged records by category, ignores unknown categories and sorts descending', () => {
  const result = parseTiantianFundDistributionResponse(
    successful({
      FCINFO: [
        { FHFCBZ: '106', FHFCZ: '1.005444122', FSRQ: '2020-12-15' },
        { FHFCBZ: 0, FHFCZ10: '0.2', FSRQ: '2020-01-01' },
      ],
      FHINFO: [
        {
          DJR: '2021-12-31',
          FFR: '2022-01-05',
          FHFCBZ: 0,
          FHFCZ10: 0.45,
          FSRQ: '2021-12-31',
        },
        { FHFCBZ: 999, FSRQ: '2022-01-01' },
      ],
    }),
    '161725',
  )

  assert.deepEqual(result, {
    conversions: [{ conversionDate: '2020-12-15', ratio: 1.005444122 }],
    dividends: [
      {
        dividendPerTenUnits: 0.45,
        equityRecordDate: '2021-12-31',
        exDividendDate: '2021-12-31',
        paymentDate: '2022-01-05',
      },
      {
        dividendPerTenUnits: 0.2,
        equityRecordDate: null,
        exDividendDate: '2020-01-01',
        paymentDate: null,
      },
    ],
    fundCode: '161725',
  })
})

test('keeps valid primary dates while normalizing invalid optional fields', () => {
  const result = parseTiantianFundDistributionResponse(
    successful({
      FHINFO: [
        {
          DJR: '2026-02-29',
          FFR: 'invalid',
          FHFCBZ: '0',
          FHFCZ10: Number.POSITIVE_INFINITY,
          FSRQ: '2024-02-29',
        },
        { FHFCBZ: 0, FSRQ: 'invalid' },
      ],
    }),
    '161725',
  )

  assert.deepEqual(result.dividends, [
    {
      dividendPerTenUnits: null,
      equityRecordDate: null,
      exDividendDate: '2024-02-29',
      paymentDate: null,
    },
  ])
  assert.deepEqual(result.conversions, [])
})

test('accepts missing record arrays and rejects malformed responses', () => {
  assert.deepEqual(parseTiantianFundDistributionResponse(successful({}), '161725'), {
    conversions: [],
    dividends: [],
    fundCode: '161725',
  })
  for (const response of [
    { data: {}, errorCode: 1, success: false },
    { data: null, errorCode: 0, success: true },
    successful({ FHINFO: {} }),
    successful({ FCINFO: 'invalid' }),
  ]) {
    assert.throws(() => parseTiantianFundDistributionResponse(response, '161725'))
  }
})

test('fetch rejects HTTP failures and propagates caller cancellation', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(fetchTiantianFundDistribution('161725'), {
    message: '基金分红送配服务暂时不可用',
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
  const request = fetchTiantianFundDistribution('161725', controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
  assert.equal(requestedSignal, controller.signal)
})

function successful(data: Record<string, unknown>): unknown {
  return { data, errorCode: 0, success: true }
}
