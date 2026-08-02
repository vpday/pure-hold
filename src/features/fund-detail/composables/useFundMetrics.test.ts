import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory.ts'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { useFundBenchmarkDataSource } from './useFundBenchmarkDataSource.ts'
import { useFundHistoryDataSource } from './useFundHistoryDataSource.ts'
import { useFundMetrics } from './useFundMetrics.ts'

test('loads all histories on first activation and never loads when selecting tabs', async () => {
  const calls: string[] = []
  const session = useFundMetrics(source(calls), benchmarkSource(calls))
  session.open('161725')
  session.selectView('annualized')
  assert.deepEqual(calls, [])
  await session.activate()
  await session.activate()
  session.selectView('calendar')
  assert.deepEqual(calls.sort(), ['benchmark', 'distribution', 'net-values'])
  assert.equal(session.model.value?.cutoffText, '基金与基准共同截至 2026-07-31')
})

test('reuses one benchmark history while switching funds', async () => {
  let benchmarkCalls = 0
  const benchmark = useFundBenchmarkDataSource({
    load: async (endDate) => {
      benchmarkCalls += 1
      return benchmarkHistory(endDate)
    },
  })
  const session = useFundMetrics(source([]), benchmark)

  session.open('161725')
  await session.activate()
  session.open('000001')
  await session.activate()

  assert.equal(benchmarkCalls, 1)
  assert.equal(session.currentFundCode.value, '000001')
})

test('keeps old data and existing error behavior when a fund refresh fails', async () => {
  let failDistribution = false
  let value = 1
  const dataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      if (failDistribution) throw new Error('failed')
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => netValues(fundCode, range, value),
  })
  const session = useFundMetrics(dataSource, benchmarkSource([]))
  session.open('161725')
  await session.activate()
  const original = session.data.value
  value = 2
  failDistribution = true
  await session.refresh()
  assert.equal(session.data.value, original)
  assert.equal(session.error.value, '基金数据指标加载失败，请稍后重试')
})

test('refreshes fund histories while reusing the same-day benchmark cache', async () => {
  let benchmarkAttempt = 0
  const benchmark = useFundBenchmarkDataSource({
    load: async (endDate) => {
      benchmarkAttempt += 1
      return benchmarkHistory(endDate)
    },
  })
  const session = useFundMetrics(source([]), benchmark)
  session.open('161725')
  await session.activate()
  const original = session.data.value

  await session.refresh()

  assert.notEqual(session.data.value, original)
  assert.equal(benchmarkAttempt, 1)
  assert.equal(session.error.value, '')
  assert.equal(session.takeNotice(), undefined)
})

test('retries a first failure and creates consumable notices per successful batch', async () => {
  let fail = true
  const dataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      if (fail) throw new Error('failed')
      return distribution(fundCode, true)
    },
    loadNetValueHistory: async (fundCode, range) => netValues(fundCode, range, 1),
  })
  const benchmark = useFundBenchmarkDataSource({
    load: async (endDate) => benchmarkHistory(endDate, true),
  })
  const session = useFundMetrics(dataSource, benchmark)
  session.open('161725')
  await session.activate()
  assert.equal(session.model.value, undefined)
  fail = false
  await session.retry()
  const fundNotice = session.takeNotice()
  assert.equal(fundNotice?.kind, 'reinvested-nav-issues')
  if (fundNotice?.kind === 'reinvested-nav-issues') assert.equal(fundNotice.totalCount, 1)
  assert.equal(session.takeNotice()?.kind, 'benchmark-history-incomplete')
  assert.equal(session.takeNotice(), undefined)
})

test('ignores an obsolete fund response', async () => {
  const firstNetValues = deferred<FundNetValueHistory>()
  const dataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => distribution(fundCode),
    loadNetValueHistory: async (fundCode, range) =>
      fundCode === '161725' ? firstNetValues.promise : netValues(fundCode, range, 2),
  })
  const session = useFundMetrics(dataSource, benchmarkSource([]))
  session.open('161725')
  const first = session.activate()
  session.open('000001')
  await session.activate()
  firstNetValues.resolve(netValues('161725', 'ln', 1))
  await first
  assert.equal(session.currentFundCode.value, '000001')
  assert.equal(session.data.value?.commonCutoffDate, '2026-07-31')
})

function source(calls: string[]) {
  return useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      calls.push('distribution')
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      calls.push('net-values')
      return netValues(fundCode, range, 1)
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

function netValues(fundCode: string, range: FundHistoryRange, value: number): FundNetValueHistory {
  return {
    fundCode,
    points: [
      {
        cumulativeNetValue: null,
        dailyGrowthPercent: null,
        date: '2025-07-31',
        unitNetValue: value,
      },
      {
        cumulativeNetValue: null,
        dailyGrowthPercent: null,
        date: '2026-07-31',
        unitNetValue: value * 1.1,
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
            exDividendDate: '2026-01-01',
            paymentDate: null,
          },
        ]
      : [],
    fundCode,
  }
}

function benchmarkHistory(endDate: string, incomplete = false): IndexPerformanceHistory {
  return {
    endDate,
    indexCode: 'H00300',
    indexName: '沪深300全收益指数',
    issues: incomplete ? [{ code: 'malformed-record', count: 1 }] : [],
    points: [
      { date: '2004-12-31', value: 1000 },
      { date: '2025-07-31', value: 2000 },
      { date: '2026-07-31', value: 2200 },
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
