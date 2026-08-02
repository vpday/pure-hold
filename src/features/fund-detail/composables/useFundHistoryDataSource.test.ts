import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory.ts'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import { useFundHistoryDataSource } from './useFundHistoryDataSource.ts'

test('shares in-flight requests, successful cache and concurrent force loads by key', async () => {
  const requests: Array<Deferred<FundNetValueHistory>> = []
  const source = useFundHistoryDataSource({
    loadNetValueHistory: async () => {
      const pending = deferred<FundNetValueHistory>()
      requests.push(pending)
      return await pending.promise
    },
  })
  const first = source.loadNetValueHistory('161725', 'ln')
  const second = source.loadNetValueHistory('161725', 'ln')
  assert.equal(requests.length, 1)
  requests[0]!.resolve(netValues('161725', 'ln', 1))
  assert.equal(await first, await second)
  await source.loadNetValueHistory('161725', 'ln')
  assert.equal(requests.length, 1)

  const refresh = source.loadNetValueHistory('161725', 'ln', { force: true })
  const joinedRefresh = source.loadNetValueHistory('161725', 'ln', { force: true })
  assert.equal(requests.length, 2)
  requests[1]!.resolve(netValues('161725', 'ln', 2))
  assert.equal(await refresh, await joinedRefresh)
})

test('keeps ranges and resource types independent', async () => {
  const netValueCalls: FundHistoryRange[] = []
  let distributionCalls = 0
  const source = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      distributionCalls += 1
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      netValueCalls.push(range)
      return netValues(fundCode, range, netValueCalls.length)
    },
  })
  await Promise.all([
    source.loadNetValueHistory('161725', '6y'),
    source.loadNetValueHistory('161725', 'ln'),
    source.loadDistribution('161725'),
  ])
  assert.deepEqual(netValueCalls, ['6y', 'ln'])
  assert.equal(distributionCalls, 1)
})

test('cancels only the subscriber until every subscriber cancels', async () => {
  let underlyingSignal: AbortSignal | undefined
  const pending = deferred<FundNetValueHistory>()
  const source = useFundHistoryDataSource({
    loadNetValueHistory: async (_code, _range, signal) => {
      underlyingSignal = signal
      return await pending.promise
    },
  })
  const firstController = new AbortController()
  const secondController = new AbortController()
  const first = source.loadNetValueHistory('161725', 'ln', { signal: firstController.signal })
  const second = source.loadNetValueHistory('161725', 'ln', { signal: secondController.signal })
  firstController.abort()
  await assert.rejects(first, { name: 'AbortError' })
  assert.equal(underlyingSignal?.aborted, false)
  secondController.abort()
  await assert.rejects(second, { name: 'AbortError' })
  assert.equal(underlyingSignal?.aborted, true)
  pending.reject(new DOMException('aborted', 'AbortError'))
})

test('does not cache failures and disposes every active request', async () => {
  const signals: AbortSignal[] = []
  let attempt = 0
  const source = useFundHistoryDataSource({
    loadDistribution: async (_code, signal) => {
      signals.push(signal!)
      return await waitForAbort(signal)
    },
    loadNetValueHistory: async (_fundCode, _range, signal) => {
      attempt += 1
      if (attempt === 1) throw new Error('failed')
      signals.push(signal!)
      return await waitForAbort(signal)
    },
  })
  await assert.rejects(source.loadNetValueHistory('161725', 'ln'), /failed/)
  const netValue = source.loadNetValueHistory('161725', 'ln')
  const distributionRequest = source.loadDistribution('161725')
  source.dispose()
  await assert.rejects(netValue, { name: 'AbortError' })
  await assert.rejects(distributionRequest, { name: 'AbortError' })
  assert.equal(
    signals.every((signal) => signal.aborted),
    true,
  )
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

function waitForAbort(signal?: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
      once: true,
    })
  })
}

function netValues(fundCode: string, range: FundHistoryRange, value: number): FundNetValueHistory {
  return {
    fundCode,
    points: [
      {
        cumulativeNetValue: value,
        dailyGrowthPercent: null,
        date: '2026-07-31',
        unitNetValue: value,
      },
    ],
    range,
  }
}

function distribution(fundCode: string): FundDistributionHistory {
  return { conversions: [], dividends: [], fundCode }
}
