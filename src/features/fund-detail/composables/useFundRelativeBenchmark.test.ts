import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory.ts'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { useFundBenchmarkDataSource } from './useFundBenchmarkDataSource.ts'
import { useFundHistoryDataSource } from './useFundHistoryDataSource.ts'
import { useFundRelativeBenchmark } from './useFundRelativeBenchmark.ts'

test('loads lazily, defaults to six months and changes ranges without requesting', async () => {
  const calls: string[] = []
  const session = useFundRelativeBenchmark(historySource(calls), benchmarkSource(calls))

  session.initialize('161725')
  assert.equal(session.selectedRange.value, '6y')
  assert.deepEqual(calls, [])
  await session.activate()
  assert.deepEqual(calls.sort(), ['benchmark', 'distribution', 'net-values'])
  assert.equal(session.data.value?.status, 'ready')

  session.selectRange('ln')
  assert.deepEqual(calls.sort(), ['benchmark', 'distribution', 'net-values'])
  assert.equal(session.data.value?.startDate, '2025-01-31')

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

test('retries an initial failure and preserves successful data after a failed refresh', async () => {
  let fail = true
  const dataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      if (fail) throw new Error('failed')
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => netValues(fundCode, range),
  })
  const session = useFundRelativeBenchmark(dataSource, benchmarkSource([]))
  session.initialize('161725')

  await session.activate()
  assert.equal(session.error.value, '相对基准加载失败，请稍后重试')
  assert.equal(Boolean(session.data.value), false)

  fail = false
  await session.retry()
  const previous = session.data.value
  assert.equal(previous?.status, 'ready')
  assert.equal(session.error.value, '')

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
  const session = useFundRelativeBenchmark(history, benchmark)
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
  const session = useFundRelativeBenchmark(history, benchmark)
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

test('ignores late results from an obsolete fund and resets the range on reopen', async () => {
  const firstNetValues = deferred<FundNetValueHistory>()
  const dataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => distribution(fundCode),
    loadNetValueHistory: async (fundCode, range) =>
      fundCode === '161725' ? firstNetValues.promise : netValues(fundCode, range),
  })
  const session = useFundRelativeBenchmark(dataSource, benchmarkSource([]))
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
  const session = useFundRelativeBenchmark(historySource(calls), benchmarkSource(calls))
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
        date: '2025-01-31',
        unitNetValue: 1,
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
            exDividendDate: '2026-01-31',
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
