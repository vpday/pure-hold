import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchTencentMarketStatus } from './fetchTencentMarketStatus.ts'

test('adds a request timestamp to the market status URL', async (context) => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response('v_marketStat="2026-07-20 15:24:19|HK_open_status";')
  }
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  assert.deepEqual([...(await fetchTencentMarketStatus(new AbortController().signal))], ['HK'])

  const url = new URL(requestedUrl)
  assert.equal(url.searchParams.get('q'), 'marketStat')
  assert.match(url.searchParams.get('_') ?? '', /^\d+$/)
})
