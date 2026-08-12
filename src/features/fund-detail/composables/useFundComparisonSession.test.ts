import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory.ts'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import {
  cumulativeExcessReturnCalculation,
  drawdownComparisonCalculation,
  rollingExcessReturnCalculation,
} from './fundComparisonCalculationAdapters.ts'
import { useFundBenchmarkDataSource } from './useFundBenchmarkDataSource.ts'
import { useFundComparisonSession } from './useFundComparisonSession.ts'
import { useFundHistoryDataSource } from './useFundHistoryDataSource.ts'

test('fund comparison adapters preserve their defaults, calculations and initial errors', async () => {
  const cumulative = useFundComparisonSession(
    historySource([]),
    benchmarkSource([]),
    cumulativeExcessReturnCalculation,
  )
  const rolling = useFundComparisonSession(
    historySource([]),
    benchmarkSource([]),
    rollingExcessReturnCalculation,
  )
  const drawdown = useFundComparisonSession(
    historySource([]),
    benchmarkSource([]),
    drawdownComparisonCalculation,
  )

  cumulative.initialize('161725')
  rolling.initialize('161725')
  drawdown.initialize('161725')
  assert.equal(cumulative.selectedRange.value, '6y')
  assert.equal(rolling.selectedRange.value, 'n')
  assert.equal(drawdown.selectedRange.value, 'n')

  await Promise.all([cumulative.activate(), rolling.activate(), drawdown.activate()])
  assert.equal(cumulative.data.value?.status, 'ready')
  assert.equal(rolling.data.value?.status, 'ready')
  assert.equal(drawdown.data.value?.status, 'ready')

  const failingHistory = useFundHistoryDataSource({
    loadDistribution: async () => {
      throw new Error('failed')
    },
    loadNetValueHistory: async (fundCode, range) => netValues(fundCode, range),
  })
  const failingRolling = useFundComparisonSession(
    failingHistory,
    benchmarkSource([]),
    rollingExcessReturnCalculation,
  )
  failingRolling.initialize('161725')
  await failingRolling.activate()
  assert.equal(failingRolling.error.value, '滚动超额加载失败，请稍后重试')
})

test('loads lazily and changes range from successful inputs without requesting', async () => {
  const calls: string[] = []
  const session = useFundComparisonSession(
    historySource(calls),
    benchmarkSource(calls),
    cumulativeExcessReturnCalculation,
  )

  session.initialize('161725')
  assert.deepEqual(calls, [])
  await session.activate()
  assert.deepEqual(calls.sort(), ['benchmark', 'distribution', 'net-values'])

  session.selectRange('ln')
  assert.deepEqual(calls.sort(), ['benchmark', 'distribution', 'net-values'])
  assert.equal(session.data.value?.startDate, '2024-01-31')

  await session.refresh()
  assert.deepEqual(calls.sort(), [
    'benchmark',
    'benchmark',
    'distribution',
    'distribution',
    'net-values',
    'net-values',
  ])
})

test('shares in-flight requests and successful caches between sessions', async () => {
  const calls: string[] = []
  const history = historySource(calls)
  const benchmark = benchmarkSource(calls)
  const first = useFundComparisonSession(history, benchmark, cumulativeExcessReturnCalculation)
  const second = useFundComparisonSession(history, benchmark, rollingExcessReturnCalculation)
  first.initialize('161725')
  second.initialize('161725')

  await Promise.all([first.activate(), second.activate()])
  assert.deepEqual(calls.sort(), ['benchmark', 'distribution', 'net-values'])

  first.close()
  first.initialize('161725')
  await first.activate()
  assert.deepEqual(calls.sort(), ['benchmark', 'distribution', 'net-values'])
})

test('retries an initial failure and preserves successful data after a failed refresh', async () => {
  let fail = true
  const history = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      if (fail) throw new Error('failed')
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => netValues(fundCode, range),
  })
  const session = useFundComparisonSession(
    history,
    benchmarkSource([]),
    cumulativeExcessReturnCalculation,
  )
  session.initialize('161725')

  await session.activate()
  assert.equal(session.error.value, '累计超额加载失败，请稍后重试')
  assert.equal(Boolean(session.data.value), false)

  fail = false
  await session.retry()
  const previous = session.data.value
  assert.equal(previous?.status, 'ready')

  fail = true
  await session.refresh()
  assert.equal(session.data.value, previous)
  assert.equal(session.error.value, '')
  assert.equal(session.warning.value, '刷新失败，当前展示旧数据')
})

test('surfaces source quality warnings without blocking a usable result', async () => {
  const history = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => distribution(fundCode, true),
    loadNetValueHistory: async (fundCode, range) => netValues(fundCode, range),
  })
  const benchmark = useFundBenchmarkDataSource({
    load: async (endDate) => benchmarkHistory(endDate, true),
  })
  const session = useFundComparisonSession(history, benchmark, drawdownComparisonCalculation)
  session.initialize('161725')

  await session.activate()

  assert.equal(session.data.value?.status, 'ready')
  assert.match(session.warning.value, /异常记录/)
})

test('closes without aborting another subscriber to the shared sources', async () => {
  const netValuesRequest = deferred<FundNetValueHistory>()
  const distributionRequest = deferred<FundDistributionHistory>()
  const benchmarkRequest = deferred<IndexPerformanceHistory>()
  let netValueSignal: AbortSignal | undefined
  let distributionSignal: AbortSignal | undefined
  let benchmarkSignal: AbortSignal | undefined
  const history = useFundHistoryDataSource({
    loadDistribution: (_fundCode, signal) => {
      distributionSignal = signal
      return distributionRequest.promise
    },
    loadNetValueHistory: (_fundCode, _range, signal) => {
      netValueSignal = signal
      return netValuesRequest.promise
    },
  })
  const benchmark = useFundBenchmarkDataSource({
    load: (_endDate, signal) => {
      benchmarkSignal = signal
      return benchmarkRequest.promise
    },
  })
  const directNetValues = history.loadNetValueHistory('161725', 'ln')
  const directDistribution = history.loadDistribution('161725')
  const directBenchmark = benchmark.load()
  const session = useFundComparisonSession(history, benchmark, rollingExcessReturnCalculation)
  session.initialize('161725')
  const activation = session.activate()

  session.close()
  assert.equal(netValueSignal?.aborted, false)
  assert.equal(distributionSignal?.aborted, false)
  assert.equal(benchmarkSignal?.aborted, false)
  netValuesRequest.resolve(netValues('161725', 'ln'))
  distributionRequest.resolve(distribution('161725'))
  benchmarkRequest.resolve(benchmarkHistory('20260809'))
  await Promise.all([activation, directNetValues, directDistribution, directBenchmark])
  assert.equal(session.data.value, undefined)
})

test('ignores obsolete responses and resets the range on reopen', async () => {
  const firstNetValues = deferred<FundNetValueHistory>()
  const history = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => distribution(fundCode),
    loadNetValueHistory: async (fundCode, range) =>
      fundCode === '161725' ? firstNetValues.promise : netValues(fundCode, range),
  })
  const session = useFundComparisonSession(
    history,
    benchmarkSource([]),
    cumulativeExcessReturnCalculation,
  )
  session.initialize('161725')
  session.selectRange('ln')
  const first = session.activate()

  session.initialize('000001')
  assert.equal(session.selectedRange.value, '6y')
  await session.activate()
  firstNetValues.resolve(netValues('161725', 'ln'))
  await first

  assert.equal(session.currentFundCode.value, '000001')
  assert.equal(session.data.value?.status, 'ready')
})

test('does not refresh until activated', async () => {
  const calls: string[] = []
  const session = useFundComparisonSession(
    historySource(calls),
    benchmarkSource(calls),
    cumulativeExcessReturnCalculation,
  )
  session.initialize('161725')
  await session.refresh()
  assert.deepEqual(calls, [])
})

function historySource(calls: string[]) {
  return useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      calls.push('distribution')
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      calls.push('net-values')
      return netValues(fundCode, range)
    },
  })
}

function benchmarkSource(calls: string[]) {
  return useFundBenchmarkDataSource({
    load: async (endDate) => {
      calls.push('benchmark')
      return benchmarkHistory(endDate)
    },
  })
}

function netValues(fundCode: string, range: FundHistoryRange): FundNetValueHistory {
  return {
    events: [],
    fundCode,
    points: [
      {
        cumulativeNetValue: null,
        dailyGrowthPercent: null,
        date: '2024-01-31',
        unitNetValue: 1,
      },
      {
        cumulativeNetValue: null,
        dailyGrowthPercent: null,
        date: '2025-01-31',
        unitNetValue: 0.9,
      },
      {
        cumulativeNetValue: null,
        dailyGrowthPercent: null,
        date: '2026-01-31',
        unitNetValue: 1.1,
      },
      {
        cumulativeNetValue: null,
        dailyGrowthPercent: null,
        date: '2026-07-31',
        unitNetValue: 1.2,
      },
    ],
    range,
  }
}

function distribution(fundCode: string, invalid = false): FundDistributionHistory {
  return {
    conversions: [],
    dividends: invalid
      ? [
          {
            dividendPerTenUnits: null,
            equityRecordDate: null,
            exDividendDate: '2025-01-31',
            paymentDate: null,
          },
        ]
      : [],
    fundCode,
  }
}

function benchmarkHistory(endDate: string, invalid = false): IndexPerformanceHistory {
  return {
    endDate,
    indexCode: 'H00300',
    indexName: '沪深300全收益指数',
    issues: invalid ? [{ code: 'malformed-record', count: 1 }] : [],
    points: [
      { date: '2004-12-31', value: 1000 },
      { date: '2024-01-31', value: 1700 },
      { date: '2025-01-31', value: 1800 },
      { date: '2026-01-31', value: 1900 },
      { date: '2026-07-31', value: 2000 },
    ],
    startDate: '20041231',
  }
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
