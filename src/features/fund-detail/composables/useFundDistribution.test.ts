import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory'
import { useFundDistribution } from './useFundDistribution.ts'

test('initializes without loading and caches the first activation', async () => {
  const calls: string[] = []
  const session = useFundDistribution(async (fundCode) => {
    calls.push(fundCode)
    return result(fundCode, calls.length)
  })

  session.initialize('161725')
  assert.equal(calls.length, 0)
  await session.activate()
  await session.activate()
  assert.equal(calls.length, 1)
  assert.equal(session.hasLoaded.value, true)

  session.close()
  session.initialize('161725')
  assert.equal(session.hasLoaded.value, false)
  await session.activate()
  assert.equal(calls.length, 1)
  assert.equal(session.data.value?.dividends[0]?.dividendPerTenUnits, 1)
})

test('cancels old funds and ignores late responses', async () => {
  const requests: PendingRequest[] = []
  const session = useFundDistribution((fundCode, signal) => {
    const pending = deferred<FundDistributionHistory>()
    requests.push({ fundCode, pending, signal })
    return pending.promise
  })

  session.initialize('161725')
  const first = session.activate()
  session.initialize('000001')
  const second = session.activate()
  assert.equal(requests[0]?.signal?.aborted, true)
  requests[0]?.pending.resolve(result('161725', 1))
  requests[1]?.pending.resolve(result('000001', 2))
  await Promise.all([first, second])
  assert.equal(session.data.value?.fundCode, '000001')
})

test('exposes a stable error, retries, and refreshes only after activation', async () => {
  let attempt = 0
  const session = useFundDistribution(async (fundCode) => {
    attempt += 1
    if (attempt === 1) throw new Error('provider detail')
    return result(fundCode, attempt)
  })
  session.initialize('161725')
  await session.refresh()
  assert.equal(attempt, 0)

  await session.activate()
  assert.equal(session.error.value, '基金分红送配加载失败，请稍后重试')
  assert.equal(session.hasLoaded.value, false)
  await session.retry()
  assert.equal(session.error.value, '')
  assert.equal(session.data.value?.dividends[0]?.dividendPerTenUnits, 2)
  await session.refresh()
  assert.equal(session.data.value?.dividends[0]?.dividendPerTenUnits, 3)
})

test('retains successful data when refresh fails and resets current state on close', async () => {
  let shouldFail = false
  let signal: AbortSignal | undefined
  const session = useFundDistribution(async (fundCode, requestSignal) => {
    signal = requestSignal
    if (shouldFail) throw new Error('provider detail')
    return result(fundCode, 1)
  })
  session.initialize('161725')
  await session.activate()
  const original = session.data.value
  shouldFail = true
  await session.refresh()
  assert.equal(session.data.value, original)
  assert.equal(session.error.value, '基金分红送配加载失败，请稍后重试')

  session.close()
  assert.equal(signal?.aborted, false)
  assert.equal(session.currentFundCode.value, undefined)
  assert.equal(session.data.value, undefined)
  assert.equal(session.hasLoaded.value, false)
})

interface PendingRequest {
  readonly fundCode: string
  readonly pending: Deferred<FundDistributionHistory>
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

function result(fundCode: string, value: number): FundDistributionHistory {
  return {
    conversions: [{ conversionDate: '2020-12-15', ratio: value }],
    dividends: [
      {
        dividendPerTenUnits: value,
        equityRecordDate: '2021-12-31',
        exDividendDate: '2021-12-31',
        paymentDate: '2022-01-05',
      },
    ],
    fundCode,
  }
}
