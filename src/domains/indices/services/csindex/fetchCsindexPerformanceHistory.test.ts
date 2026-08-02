import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchCsindexPerformanceHistory } from './fetchCsindexPerformanceHistory.ts'

test('fetches the requested full history and parses the response', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  let requestedUrl = ''
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return Response.json({
      code: '200',
      data: [
        {
          close: 1000,
          indexCode: 'H00300',
          indexNameCnAll: '沪深300全收益指数',
          tradeDate: '20041231',
        },
      ],
      success: true,
    })
  }

  const result = await fetchCsindexPerformanceHistory('20260801', new AbortController().signal)

  assert.match(requestedUrl, /indexCode=H00300/)
  assert.match(requestedUrl, /startDate=20041231/)
  assert.match(requestedUrl, /endDate=20260801/)
  assert.equal(result.points[0]?.value, 1000)
})

test('rejects HTTP failures and propagates cancellation', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(fetchCsindexPerformanceHistory('20260801', new AbortController().signal), {
    message: '沪深300全收益指数服务暂时不可用',
  })

  const controller = new AbortController()
  globalThis.fetch = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('aborted', 'AbortError')),
        { once: true },
      )
    })
  const request = fetchCsindexPerformanceHistory('20260801', controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
})
