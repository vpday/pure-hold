import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundAssetAllocation } from '@/domains/funds/models/fundAssetAllocation.ts'
import { useFundAssetAllocation } from './useFundAssetAllocation.ts'

test('opens lazily and caches successful activation across close', async () => {
  const calls: string[] = []
  const session = useFundAssetAllocation(async (fundCode) => {
    calls.push(fundCode)
    return result(fundCode, calls.length)
  })

  session.open('161725')
  assert.equal(calls.length, 0)
  await session.activate()
  await session.activate()
  assert.equal(calls.length, 1)
  assert.equal(session.data.value?.points[0]?.stockPercent, 1)

  session.close()
  session.open('161725')
  await session.activate()
  assert.equal(calls.length, 1)
  assert.equal(session.data.value?.points[0]?.stockPercent, 1)
})

test('cancels obsolete funds and ignores late responses', async () => {
  const requests: PendingRequest[] = []
  const session = useFundAssetAllocation((fundCode, signal) => {
    const pending = deferred<FundAssetAllocation>()
    requests.push({ fundCode, pending, signal })
    return pending.promise
  })

  session.open('161725')
  const first = session.activate()
  session.open('000001')
  const second = session.activate()
  assert.equal(requests[0]?.signal?.aborted, true)
  requests[0]?.pending.resolve(result('161725', 1))
  requests[1]?.pending.resolve(result('000001', 2))
  await Promise.all([first, second])
  assert.equal(session.data.value?.fundCode, '000001')
  assert.equal(session.data.value?.points[0]?.stockPercent, 2)
})

test('shows a stable first-load error and recovers on retry', async () => {
  let attempt = 0
  const session = useFundAssetAllocation(async (fundCode) => {
    attempt += 1
    if (attempt === 1) throw new Error('provider detail')
    return result(fundCode, attempt)
  })

  session.open('161725')
  await session.refresh()
  assert.equal(attempt, 0)
  await session.activate()
  assert.equal(session.error.value, '资产配置加载失败，请稍后重试')
  assert.equal(session.data.value, undefined)
  await session.retry()
  assert.equal(session.error.value, '')
  const recovered = session.data.value as FundAssetAllocation | undefined
  assert.equal(recovered?.points[0]?.stockPercent, 2)
})

test('retains successful data with a warning when refresh fails', async () => {
  let shouldFail = false
  const session = useFundAssetAllocation(async (fundCode) => {
    if (shouldFail) throw new Error('provider detail')
    return result(fundCode, 1)
  })

  session.open('161725')
  await session.activate()
  const original = session.data.value
  shouldFail = true
  await session.refresh()
  assert.equal(session.data.value, original)
  assert.equal(session.error.value, '')
  assert.equal(session.warning.value, '资产配置刷新失败，当前显示上次数据')

  shouldFail = false
  await session.refresh()
  assert.equal(session.warning.value, '')
})

test('close aborts an active request without showing an error', async () => {
  let signal: AbortSignal | undefined
  const session = useFundAssetAllocation((_fundCode, requestSignal) => {
    signal = requestSignal
    return new Promise<FundAssetAllocation>((_resolve, reject) => {
      requestSignal?.addEventListener(
        'abort',
        () => reject(new DOMException('aborted', 'AbortError')),
        { once: true },
      )
    })
  })

  session.open('161725')
  const request = session.activate()
  session.close()
  await request
  assert.equal(signal?.aborted, true)
  assert.equal(session.error.value, '')
  assert.equal(session.isLoading.value, false)
})

interface PendingRequest {
  readonly fundCode: string
  readonly pending: Deferred<FundAssetAllocation>
  readonly signal?: AbortSignal
}

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

function result(fundCode: string, value: number): FundAssetAllocation {
  return {
    fundCode,
    points: [
      {
        bondPercent: value,
        cashPercent: value,
        date: '2026-06-30',
        netAssetValue: value,
        stockPercent: value,
      },
    ],
  }
}
