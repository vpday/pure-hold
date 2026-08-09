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
  const originalRisk = session.riskData.value
  value = 2
  failDistribution = true
  await session.refresh()
  assert.equal(session.data.value, original)
  assert.equal(session.riskData.value, originalRisk)
  assert.equal(session.error.value, '基金数据指标加载失败，请稍后重试')
})

test('force refreshes fund and same-day benchmark histories', async () => {
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

  const result = await session.refresh()

  assert.notEqual(session.data.value, original)
  assert.equal(result, 'updated')
  assert.equal(benchmarkAttempt, 2)
  assert.equal(session.error.value, '')
  assert.deepEqual(session.model.value?.alerts, [])
})

test('retries a first failure and keeps data quality issues in the section model', async () => {
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
  assert.equal(await session.activate(), 'failed')
  assert.equal(Boolean(session.model.value), false)
  fail = false
  assert.equal(await session.retry(), 'updated')
  assert.deepEqual(
    session.model.value?.alerts.map(({ key }) => key),
    ['reinvested-nav-issues', 'benchmark-malformed-records'],
  )
})

test('reports a benchmark refresh fallback and clears its persistent alert after recovery', async () => {
  let currentDate = new Date('2026-07-31T12:00:00.000Z')
  let fail = false
  const benchmark = useFundBenchmarkDataSource({
    load: async (endDate) => {
      if (fail) throw new Error('failed')
      return benchmarkHistory(endDate)
    },
    now: () => currentDate,
  })
  const session = useFundMetrics(source([]), benchmark)
  session.open('161725')
  assert.equal(await session.activate(), 'updated')

  currentDate = new Date('2026-08-01T12:00:00.000Z')
  fail = true
  assert.equal(await session.refresh(), 'showing-stale-data')
  assert.equal(session.error.value, '')
  assert.deepEqual(
    session.model.value?.alerts.map(({ key }) => key),
    ['stale-data'],
  )

  fail = false
  assert.equal(await session.refresh(), 'updated')
  assert.deepEqual(session.model.value?.alerts, [])
})

test('applies session risk assumptions without network requests and rejects invalid drafts', async () => {
  const calls: string[] = []
  const dataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      calls.push('distribution')
      return distribution(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      calls.push('net-values')
      return denseNetValues(fundCode, range)
    },
  })
  const benchmark = useFundBenchmarkDataSource({
    load: async (endDate) => {
      calls.push('benchmark')
      return denseBenchmarkHistory(endDate)
    },
  })
  const session = useFundMetrics(dataSource, benchmark)
  session.open('161725')
  await session.activate()
  const returnsBefore = session.data.value
  const riskBefore = session.riskData.value

  session.updateRiskFreeRateDraft(0)
  session.updateTargetRateDraft(0)
  assert.equal(session.riskData.value, riskBefore)
  session.applyRiskAssumptions()
  assert.equal(calls.length, 3)
  assert.equal(session.data.value, returnsBefore)
  assert.notEqual(session.riskData.value, riskBefore)
  const appliedRisk = session.riskData.value

  session.updateRiskFreeRateDraft(-100)
  session.applyRiskAssumptions()
  assert.equal(session.riskData.value, appliedRisk)
  assert.equal(session.riskParameterError.value, '请输入大于 -100% 的有效年化百分比')
  assert.equal(calls.length, 3)

  session.updateRiskFreeRateDraft(0)
  session.close()
  assert.equal(session.riskFreeRateDraft.value, 0)
  assert.equal(session.targetRateDraft.value, 0)
  session.open('000001')
  await session.activate()
  assert.equal(calls.length, 5)
  assert.equal(session.riskParameterError.value, '')
  assert.deepEqual(session.riskData.value, appliedRisk)
  const switchedRisk = session.riskData.value
  await session.refresh()
  assert.equal(calls.length, 8)
  assert.deepEqual(session.riskData.value, switchedRisk)
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
    events: [],
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

function denseNetValues(fundCode: string, range: FundHistoryRange): FundNetValueHistory {
  return {
    events: [],
    fundCode,
    points: weekdays('2020-01-01', '2026-07-31').map((date, index) => {
      const unitNetValue = 1 + index * 0.0002 + Math.sin(index / 15) * 0.01
      return {
        cumulativeNetValue: null,
        dailyGrowthPercent: null,
        date,
        unitNetValue,
      }
    }),
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

function denseBenchmarkHistory(endDate: string): IndexPerformanceHistory {
  return {
    endDate,
    indexCode: 'H00300',
    indexName: '沪深300全收益指数',
    issues: [],
    points: weekdays('2020-01-01', '2026-07-31').map((date, index) => ({
      date,
      value: 1000 + index * 0.2 + Math.sin(index / 12) * 10,
    })),
    startDate: '20041231',
  }
}

function weekdays(startDate: string, endDate: string): readonly string[] {
  const dates: string[] = []
  const current = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  while (current <= end) {
    if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) {
      dates.push(current.toISOString().slice(0, 10))
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
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
