import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { useFundBenchmarkDataSource } from './useFundBenchmarkDataSource.ts'

test('shares in-flight loads and caches one successful request per Shanghai calendar day', async () => {
  const requests: Array<Deferred<IndexPerformanceHistory>> = []
  const endDates: string[] = []
  let now = new Date('2026-07-31T16:00:00Z')
  const source = useFundBenchmarkDataSource({
    load: async (endDate) => {
      endDates.push(endDate)
      const request = deferred<IndexPerformanceHistory>()
      requests.push(request)
      return await request.promise
    },
    now: () => now,
  })

  const first = source.load()
  const second = source.load()
  assert.equal(requests.length, 1)
  requests[0]!.resolve(history('20260801', 1000))
  assert.equal(await first, await second)

  now = new Date('2026-08-01T15:59:59Z')
  assert.equal((await source.load()).endDate, '20260801')
  assert.equal((await source.load({ force: true })).endDate, '20260801')
  assert.equal(requests.length, 1)

  now = new Date('2026-08-01T16:00:00Z')
  const refresh = source.load()
  const joinedRefresh = source.load({ force: true })
  assert.equal(requests.length, 2)
  assert.deepEqual(endDates, ['20260801', '20260802'])
  requests[1]!.resolve(history('20260802', 1010))
  assert.equal(await refresh, await joinedRefresh)
  assert.equal((await source.load()).endDate, '20260802')
})

test('does not cache a failed refresh after the previous day expires', async () => {
  let attempt = 0
  let now = new Date('2026-08-01T00:00:00Z')
  const source = useFundBenchmarkDataSource({
    load: async (endDate) => {
      attempt += 1
      if (attempt === 2) throw new Error('failed')
      return history(endDate, attempt)
    },
    now: () => now,
  })

  assert.equal((await source.load()).endDate, '20260801')
  now = new Date('2026-08-01T16:00:00Z')
  await assert.rejects(source.load(), /failed/)
  assert.equal((await source.load()).endDate, '20260802')
  assert.equal(attempt, 3)
})

test('cancels only the subscriber until every subscriber cancels', async () => {
  let underlyingSignal: AbortSignal | undefined
  const request = deferred<IndexPerformanceHistory>()
  const source = useFundBenchmarkDataSource({
    load: async (_endDate, signal) => {
      underlyingSignal = signal
      return await request.promise
    },
  })
  const firstController = new AbortController()
  const secondController = new AbortController()
  const first = source.load({ signal: firstController.signal })
  const second = source.load({ signal: secondController.signal })

  firstController.abort()
  await assert.rejects(first, { name: 'AbortError' })
  assert.equal(underlyingSignal?.aborted, false)
  secondController.abort()
  await assert.rejects(second, { name: 'AbortError' })
  assert.equal(underlyingSignal?.aborted, true)
  request.reject(new DOMException('aborted', 'AbortError'))
})

test('does not cache failures and dispose aborts the active request', async () => {
  let attempt = 0
  let underlyingSignal: AbortSignal | undefined
  const source = useFundBenchmarkDataSource({
    load: async (_endDate, signal) => {
      attempt += 1
      if (attempt === 1) throw new Error('failed')
      underlyingSignal = signal
      return await waitForAbort(signal)
    },
  })

  await assert.rejects(source.load(), /failed/)
  const request = source.load()
  source.dispose()
  await assert.rejects(request, { name: 'AbortError' })
  assert.equal(underlyingSignal?.aborted, true)
  await assert.rejects(source.load(), /disposed/)
})

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly reject: (error: unknown) => void
  readonly resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let reject!: (error: unknown) => void
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete, fail) => {
    reject = fail
    resolve = complete
  })
  return { promise, reject, resolve }
}

function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
      once: true,
    })
  })
}

function history(endDate: string, value: number): IndexPerformanceHistory {
  return {
    endDate,
    indexCode: 'H00300',
    indexName: '沪深300全收益指数',
    issues: [],
    points: [{ date: '2004-12-31', value }],
    startDate: '20041231',
  }
}
