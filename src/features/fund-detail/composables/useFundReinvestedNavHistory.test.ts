import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory.ts'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import { useFundHistoryDataSource } from './useFundHistoryDataSource.ts'
import { useFundReinvestedNavHistory } from './useFundReinvestedNavHistory.ts'

test('loads inception data once, filters locally, and reuses successful caches', async () => {
  const netValueCalls: FundHistoryRange[] = []
  const distributionCalls: string[] = []
  const dataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      distributionCalls.push(fundCode)
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      netValueCalls.push(range)
      return history(fundCode, range)
    },
  })
  const session = useFundReinvestedNavHistory(dataSource)

  session.initialize('161725')
  assert.deepEqual(netValueCalls, [])
  await session.activate()
  session.selectRange('n')
  assert.deepEqual(netValueCalls, ['ln'])
  assert.deepEqual(distributionCalls, ['161725'])

  session.close()
  session.initialize('161725')
  await session.activate()
  assert.deepEqual(netValueCalls, ['ln'])
  assert.deepEqual(distributionCalls, ['161725'])

  await session.refresh()
  assert.deepEqual(netValueCalls, ['ln', 'ln'])
  assert.deepEqual(distributionCalls, ['161725', '161725'])
})

test('shares in-flight requests and cancellation with other data-source subscribers', async () => {
  const netValues = deferred<FundNetValueHistory>()
  const distributions = deferred<FundDistributionHistory>()
  let netValueSignal: AbortSignal | undefined
  let distributionSignal: AbortSignal | undefined
  const dataSource = useFundHistoryDataSource({
    loadDistribution: (_fundCode, signal) => {
      distributionSignal = signal
      return distributions.promise
    },
    loadNetValueHistory: (_fundCode, _range, signal) => {
      netValueSignal = signal
      return netValues.promise
    },
  })
  const directNetValues = dataSource.loadNetValueHistory('161725', 'ln')
  const directDistribution = dataSource.loadDistribution('161725')
  const session = useFundReinvestedNavHistory(dataSource)
  session.initialize('161725')
  const activation = session.activate()

  session.close()
  assert.equal(netValueSignal?.aborted, false)
  assert.equal(distributionSignal?.aborted, false)
  netValues.resolve(history('161725', 'ln'))
  distributions.resolve(distribution('161725'))
  await Promise.all([activation, directNetValues, directDistribution])
})

test('retains successful data when a forced refresh fails', async () => {
  let fail = false
  const dataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      if (fail) throw new Error('distribution failed')
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      if (fail) throw new Error('net values failed')
      return history(fundCode, range)
    },
  })
  const session = useFundReinvestedNavHistory(dataSource)
  session.initialize('161725')
  await session.activate()
  const previous = session.data.value

  fail = true
  await session.refresh()
  assert.equal(session.data.value, previous)
  assert.match(session.error.value, /加载失败/)
})

test('ignores responses from an obsolete fund', async () => {
  const netValues = new Map<string, ReturnType<typeof deferred<FundNetValueHistory>>>()
  const distributions = new Map<string, ReturnType<typeof deferred<FundDistributionHistory>>>()
  const dataSource = useFundHistoryDataSource({
    loadDistribution: (fundCode) => {
      const request = deferred<FundDistributionHistory>()
      distributions.set(fundCode, request)
      return request.promise
    },
    loadNetValueHistory: (fundCode) => {
      const request = deferred<FundNetValueHistory>()
      netValues.set(fundCode, request)
      return request.promise
    },
  })
  const session = useFundReinvestedNavHistory(dataSource)
  session.initialize('161725')
  const first = session.activate()
  session.initialize('000001')
  const second = session.activate()

  netValues.get('000001')?.resolve(history('000001', 'ln'))
  distributions.get('000001')?.resolve(distribution('000001'))
  await second
  netValues.get('161725')?.resolve(history('161725', 'ln'))
  distributions.get('161725')?.resolve(distribution('161725'))
  await first

  assert.equal(session.currentFundCode.value, '000001')
  assert.equal(session.data.value?.points[0]?.unitNetValue, 1)
})

function history(fundCode: string, range: FundHistoryRange): FundNetValueHistory {
  return {
    events: [],
    fundCode,
    points: [
      {
        cumulativeNetValue: 1,
        dailyGrowthPercent: null,
        date: '2025-07-29',
        unitNetValue: 1,
      },
      {
        cumulativeNetValue: 1.2,
        dailyGrowthPercent: null,
        date: '2026-07-29',
        unitNetValue: 1.2,
      },
    ],
    range,
  }
}

function distribution(fundCode: string): FundDistributionHistory {
  return { conversions: [], dividends: [], fundCode }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}
