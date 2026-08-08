import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundHoldingQuoteRequest } from '../../models/fundHoldingQuote.ts'
import { createTencentFundHoldingQuotesRequestUrl } from './createTencentFundHoldingQuotesRequestUrl.ts'
import { fetchTencentFundHoldingQuotes } from './fetchTencentFundHoldingQuotes.ts'
import { parseTencentFundHoldingQuotesResponse } from './parseTencentFundHoldingQuotesResponse.ts'

const requests: readonly FundHoldingQuoteRequest[] = [
  { code: '600000', market: 'sh' },
  { code: '118034', market: 'sh' },
]

test('creates one HTTPS batch URL and preserves first occurrence order', () => {
  const url = createTencentFundHoldingQuotesRequestUrl([
    ...requests,
    { code: '600000', market: 'sh' },
  ])
  assert.equal(url.protocol, 'https:')
  assert.equal(url.host, 'qt.gtimg.cn')
  assert.equal(url.searchParams.get('q'), 'sh600000,sh118034')
  assert.match(url.searchParams.get('_') ?? '', /^\d+$/)
  assert.equal(
    createTencentFundHoldingQuotesRequestUrl([
      ...requests,
      { code: '60000', market: 'sh' },
      { code: '00700', market: 'hk' },
      { code: 'NVDA', market: 'us' },
    ]).searchParams.get('q'),
    'sh600000,sh118034,sh60000,s_hk00700,s_usNVDA',
  )
  assert.throws(() => createTencentFundHoldingQuotesRequestUrl([]), /at least one/)
  assert.throws(
    () => createTencentFundHoldingQuotesRequestUrl([{ code: '', market: 'sh' }]),
    /invalid/,
  )
})

test('parses mixed stock and bond prices with partial nullable fields', () => {
  const response = [
    quoteRecord('sh', '600000', '10.50', '-1.20'),
    quoteRecord('sh', '118034', '118.798', ''),
    quoteRecord('sz', '000001', '12', '1'),
  ].join('\n')
  assert.deepEqual(parseTencentFundHoldingQuotesResponse(response, requests), [
    { code: '600000', dailyChangePercent: -1.2, latestPrice: 10.5, market: 'sh' },
    { code: '118034', dailyChangePercent: null, latestPrice: 118.798, market: 'sh' },
  ])
})

test('parses Tencent HK and US quote symbols with market-specific fields', () => {
  const requests: readonly FundHoldingQuoteRequest[] = [
    { code: 'NVDA', market: 'us' },
    { code: 'AAPL', market: 'us' },
    { code: '00700', market: 'hk' },
  ]
  const response = [
    'v_s_usNVDA="200~英伟达~NVDA.OQ~223.96~4.97~2.27~105669440~23567997731~54245.35160~";',
    'v_s_usAAPL="200~苹果~AAPL.OQ~313.33~0.92~0.29~34437191~10776446647~45727.94419~";',
    'v_s_hk00700="100~腾讯控股~00700~478.800~-0.400~-0.08~16319939.0~7803757295.250~~43488.0714";',
  ].join(' ')

  assert.deepEqual(parseTencentFundHoldingQuotesResponse(response, requests), [
    { code: 'NVDA', dailyChangePercent: 2.27, latestPrice: 223.96, market: 'us' },
    { code: 'AAPL', dailyChangePercent: 0.29, latestPrice: 313.33, market: 'us' },
    { code: '00700', dailyChangePercent: -0.08, latestPrice: 478.8, market: 'hk' },
  ])
})

test('ignores mismatched and malformed records but rejects a wholly invalid response', () => {
  const mismatched = `v_sh600000="name~ignored~000001~10";`
  assert.throws(
    () => parseTencentFundHoldingQuotesResponse(mismatched, requests),
    /腾讯持仓行情服务返回了无效数据/,
  )
  assert.throws(
    () => parseTencentFundHoldingQuotesResponse('not a quote', requests),
    /腾讯持仓行情服务返回了无效数据/,
  )
})

test('fetch checks HTTP status and uses an abortable decoded response', async (context) => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  let requestedSignal: AbortSignal | null | undefined
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedSignal = init?.signal
    return new Response(new TextEncoder().encode(quoteRecord('sh', '600000', '10.5', '+0.25')))
  }
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  const controller = new AbortController()
  const result = await fetchTencentFundHoldingQuotes([requests[0]!], controller.signal)
  assert.match(requestedUrl, /^https:\/\/qt\.gtimg\.cn\//)
  assert.ok(requestedSignal)
  assert.deepEqual(result, [
    { code: '600000', dailyChangePercent: 0.25, latestPrice: 10.5, market: 'sh' },
  ])
})

test('fetch rejects HTTP failures', async (context) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('', { status: 503 })
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  await assert.rejects(fetchTencentFundHoldingQuotes(requests), /HTTP 503/)
})

function quoteRecord(
  market: 'sh' | 'sz',
  code: string,
  price: string,
  changePercent: string,
): string {
  const fields = Array.from({ length: 33 }, () => '')
  fields[1] = 'name'
  fields[2] = code
  fields[3] = price
  fields[32] = changePercent
  return `v_${market}${code}="${fields.join('~')}";`
}
