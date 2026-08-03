import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import { useFundNetValueHistory } from './useFundNetValueHistory.ts'

test('initializes one shared range without prefetching and loads on first activation', async () => {
  const calls: RequestArgs[] = []
  const session = useFundNetValueHistory(async (...args) => {
    calls.push(args)
    return result(args[0], args[1], 1)
  })

  session.initialize('161725')
  assert.equal(session.selectedRange.value, '6y')
  assert.equal(calls.length, 0)

  await session.activate()
  assert.equal(calls.length, 1)
  assert.equal(session.data.value?.range, '6y')
})

test('shares successful cache and concurrent activation requests', async () => {
  const requests: PendingRequest[] = []
  const session = useFundNetValueHistory((fundCode, range, signal) => {
    const pending = deferred<FundNetValueHistory>()
    requests.push({ fundCode, pending, range, signal })
    return pending.promise
  })
  session.initialize('161725')

  const first = session.activate()
  const second = session.activate()
  assert.equal(requests.length, 1)
  requests[0]?.pending.resolve(result('161725', '6y', 1))
  await Promise.all([first, second])
  assert.equal(session.data.value?.points[0]?.unitNetValue, 1)

  await session.activate()
  assert.equal(requests.length, 1)
  assert.equal(session.data.value?.points[0]?.unitNetValue, 1)
})

test('changes the shared range without prefetching an inactive chart', async () => {
  const calls: RequestArgs[] = []
  const session = useFundNetValueHistory(async (...args) => {
    calls.push(args)
    return result(args[0], args[1], calls.length)
  })
  session.initialize('161725')
  await session.selectRange('ln')

  assert.equal(session.selectedRange.value, 'ln')
  assert.equal(calls.length, 0)

  await session.activate()
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.[1], 'ln')
})

test('aborts a different request key and ignores its late response', async () => {
  const requests: PendingRequest[] = []
  const session = useFundNetValueHistory((fundCode, range, signal) => {
    const pending = deferred<FundNetValueHistory>()
    requests.push({ fundCode, pending, range, signal })
    return pending.promise
  })
  session.initialize('161725')

  const first = session.activate()
  const second = session.selectRange('ln')
  assert.equal(requests[0]?.signal?.aborted, true)
  requests[0]?.pending.resolve(result('161725', '6y', 1))
  requests[1]?.pending.resolve(result('161725', 'ln', 2))
  await Promise.all([first, second])
  assert.equal(session.data.value?.range, 'ln')
  assert.equal(session.data.value?.points[0]?.unitNetValue, 2)
})

test('aborts an active request before restoring a different cached key', async () => {
  const refresh = deferred<FundNetValueHistory>()
  let requestCount = 0
  let refreshSignal: AbortSignal | undefined
  const session = useFundNetValueHistory((fundCode, range, signal) => {
    requestCount += 1
    if (requestCount === 3) {
      refreshSignal = signal
      return refresh.promise
    }
    return Promise.resolve(result(fundCode, range, requestCount))
  })
  session.initialize('161725')
  await session.activate()
  await session.selectRange('ln')
  await session.selectRange('6y')

  const refreshing = session.refresh()
  const restoring = session.selectRange('ln')
  assert.equal(refreshSignal?.aborted, true)
  refresh.resolve(result('161725', '6y', 3))
  await Promise.all([refreshing, restoring])
  assert.equal(requestCount, 3)
  assert.equal(session.data.value?.range, 'ln')
  assert.equal(session.data.value?.points[0]?.unitNetValue, 2)
})

test('retains old data on failure, silences aborts and retries', async () => {
  let attempt = 0
  const session = useFundNetValueHistory(async (fundCode, range) => {
    attempt += 1
    if (attempt === 2) throw new DOMException('aborted', 'AbortError')
    if (attempt === 3) throw new Error('provider detail')
    return result(fundCode, range, attempt)
  })
  session.initialize('161725')
  await session.activate()
  const original = session.data.value

  await session.selectRange('3y')
  assert.equal(session.error.value, '')
  assert.equal(session.data.value, original)
  await session.retry()
  assert.equal(session.error.value, '基金净值历史加载失败，请稍后重试')
  assert.equal(session.data.value, original)
  await session.retry()
  assert.equal(session.error.value, '')
  assert.equal(session.data.value?.range, '3y')
})

test('shows a stable first-load error and resets on close', async () => {
  let signal: AbortSignal | undefined
  const pending = deferred<FundNetValueHistory>()
  const session = useFundNetValueHistory((_fundCode, _range, requestSignal) => {
    signal = requestSignal
    return pending.promise
  })
  session.initialize('161725')
  const request = session.activate()
  session.close()
  assert.equal(signal?.aborted, true)
  pending.reject(new DOMException('aborted', 'AbortError'))
  await request
  assert.equal(session.currentFundCode.value, undefined)
  assert.equal(session.selectedRange.value, '6y')
  assert.equal(session.data.value, undefined)

  const failed = useFundNetValueHistory(async () => {
    throw new Error('provider detail')
  })
  failed.initialize('161725')
  await failed.activate()
  assert.equal(failed.error.value, '基金净值历史加载失败，请稍后重试')
})

test('reopens lazily with session cache and refresh replaces only the current key', async () => {
  const calls: RequestArgs[] = []
  const session = useFundNetValueHistory(async (...args) => {
    calls.push(args)
    return result(args[0], args[1], calls.length)
  })
  session.initialize('161725')
  await session.activate()
  await session.selectRange('ln')
  session.close()
  session.initialize('161725')
  assert.equal(calls.length, 2)

  await session.activate()
  assert.equal(calls.length, 2)
  assert.equal(session.data.value?.points[0]?.unitNetValue, 1)
  await session.refresh()
  assert.equal(calls.length, 3)
  assert.equal(session.data.value?.points[0]?.unitNetValue, 3)

  await session.selectRange('ln')
  assert.equal(calls.length, 3)
  assert.equal(session.data.value?.points[0]?.unitNetValue, 2)
})

type RequestArgs = [fundCode: string, range: FundHistoryRange, signal?: AbortSignal]

interface PendingRequest {
  readonly fundCode: string
  readonly pending: Deferred<FundNetValueHistory>
  readonly range: FundHistoryRange
  readonly signal?: AbortSignal
}

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

function result(fundCode: string, range: FundHistoryRange, value: number): FundNetValueHistory {
  return {
    events: [],
    fundCode,
    range,
    points: [
      {
        cumulativeNetValue: value + 1,
        dailyGrowthPercent: value,
        date: '2026-07-29',
        unitNetValue: value,
      },
    ],
  }
}
