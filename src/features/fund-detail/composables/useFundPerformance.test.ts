import assert from 'node:assert/strict'
import test from 'node:test'
import { ref } from 'vue'

import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo'
import type { FundCumulativeReturns } from '@/domains/funds/models/fundCumulativeReturns'
import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory'
import { useFundBenchmarkDataSource } from './useFundBenchmarkDataSource'
import { useFundHistoryDataSource } from './useFundHistoryDataSource'
import { useFundMetrics } from './useFundMetrics'
import { useFundPerformance } from './useFundPerformance'

test('owns performance initialization and builds every chart model', async () => {
  const cumulativeCalls: unknown[][] = []
  const distributionCalls: unknown[][] = []
  const netValueCalls: unknown[][] = []
  const performance = useFundPerformance(ref(true), {
    loadCumulativeReturns: async (...args) => {
      cumulativeCalls.push(args)
      return cumulativeResult(args[0], args[1], args[2])
    },
    loadDistribution: async (...args) => {
      distributionCalls.push(args)
      return distributionResult(args[0])
    },
    loadNetValueHistory: async (...args) => {
      netValueCalls.push(args)
      return netValueResult(args[0], args[1])
    },
  })

  performance.open('161725')
  await performance.updateBasicInfo('161725', basicInfo('161725', '399997', '中证白酒指数'))

  assert.equal(performance.model.value.activeView, 'cumulative-returns')
  assert.equal(performance.model.value.cumulativeReturns.chart?.series[1].name, '中证白酒指数')
  assert.deepEqual(cumulativeCalls[0]?.slice(0, 3), ['161725', '399997', '6y'])
  assert.equal(distributionCalls.length, 0)
  assert.equal(netValueCalls.length, 0)

  await performance.activateDistribution()
  await performance.selectView('net-value')

  assert.equal(performance.model.value.distribution.dividends[0]?.dividendPerTenUnits, '0.4500')
  assert.equal(distributionCalls.length, 1)
  assert.equal(performance.model.value.activeView, 'net-value')
  assert.equal(performance.model.value.netValue.chart?.series[0].values[0], 1)
  assert.deepEqual(netValueCalls[0]?.slice(0, 2), ['161725', '6y'])

  await performance.selectView('reinvested-net-value')
  assert.equal(performance.model.value.reinvestedNetValue.chart?.series[1].name, '复权净值')
  assert.equal(
    performance.model.value.reinvestedNetValue.warning,
    '部分净值、分红或份额折算数据异常，已忽略异常记录',
  )
  assert.deepEqual(netValueCalls[1]?.slice(0, 2), ['161725', 'ln'])
  assert.equal(distributionCalls.length, 1)
})

test('routes ranges and retries through the active performance session', async () => {
  const cumulativeCalls: unknown[][] = []
  const netValueCalls: unknown[][] = []
  const performance = useFundPerformance(ref(true), {
    loadCumulativeReturns: async (...args) => {
      cumulativeCalls.push(args)
      return cumulativeResult(args[0], args[1], args[2])
    },
    loadDistribution: async (fundCode) => distributionResult(fundCode),
    loadNetValueHistory: async (...args) => {
      netValueCalls.push(args)
      return netValueResult(args[0], args[1])
    },
  })

  performance.open('161725')
  await performance.updateBasicInfo('161725', basicInfo('161725'))
  await performance.selectRange('cumulative-returns', 'n')
  await performance.retry('cumulative-returns')
  await performance.selectView('net-value')
  await performance.selectRange('net-value', '3n')
  await performance.retry('net-value')
  await performance.selectView('reinvested-net-value')
  await performance.selectRange('reinvested-net-value', 'y')
  await performance.retry('reinvested-net-value')

  assert.deepEqual(
    cumulativeCalls.map((call) => call.slice(0, 3)),
    [
      ['161725', '000001', '6y'],
      ['161725', '000001', 'n'],
      ['161725', '000001', 'n'],
    ],
  )
  assert.deepEqual(
    netValueCalls.map((call) => call.slice(0, 2)),
    [
      ['161725', '6y'],
      ['161725', '3n'],
      ['161725', '3n'],
      ['161725', 'ln'],
      ['161725', 'ln'],
    ],
  )
})

test('activates, filters, retries and resets the relative benchmark session', async () => {
  const benchmarkCalls: string[] = []
  const distributionCalls: string[] = []
  const netValueCalls: FundHistoryRange[] = []
  const performance = useFundPerformance(ref(true), {
    loadBenchmarkHistory: async (endDate) => {
      benchmarkCalls.push(endDate)
      return benchmarkResult(endDate)
    },
    loadDistribution: async (fundCode) => {
      distributionCalls.push(fundCode)
      return distributionResult(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      netValueCalls.push(range)
      return netValueResult(fundCode, range)
    },
  })

  performance.open('161725')
  assert.deepEqual(benchmarkCalls, [])
  await performance.selectView('relative-benchmark')
  assert.equal(performance.model.value.activeView, 'relative-benchmark')
  assert.equal(performance.model.value.relativeBenchmark.chart?.series.name, '累计超额收益')
  assert.deepEqual(netValueCalls, ['ln'])
  assert.deepEqual(distributionCalls, ['161725'])
  assert.equal(benchmarkCalls.length, 1)

  await performance.selectRange('relative-benchmark', 'ln')
  assert.equal(performance.model.value.relativeBenchmark.selectedRange, 'ln')
  assert.deepEqual(netValueCalls, ['ln'])
  assert.equal(benchmarkCalls.length, 1)

  await performance.retry('relative-benchmark')
  assert.deepEqual(netValueCalls, ['ln', 'ln'])
  assert.equal(benchmarkCalls.length, 2)

  performance.open('000001')
  assert.equal(performance.model.value.activeView, 'cumulative-returns')
  assert.equal(performance.model.value.relativeBenchmark.selectedRange, '6y')
  assert.equal(performance.model.value.relativeBenchmark.chart, undefined)
})

test('refreshes only the visible active view and resets on reopen', async () => {
  const isVisible = ref(false)
  const distributionCalls: unknown[][] = []
  const netValueCalls: unknown[][] = []
  const performance = useFundPerformance(isVisible, {
    loadCumulativeReturns: async (fundCode, referenceIndexCode, range) =>
      cumulativeResult(fundCode, referenceIndexCode, range),
    loadDistribution: async (...args) => {
      distributionCalls.push(args)
      return distributionResult(args[0])
    },
    loadNetValueHistory: async (...args) => {
      netValueCalls.push(args)
      return netValueResult(args[0], args[1])
    },
  })

  performance.open('161725')
  await performance.activateDistribution()
  await performance.selectView('net-value')
  await performance.refresh()
  assert.equal(netValueCalls.length, 1)
  assert.equal(distributionCalls.length, 1)

  isVisible.value = true
  await performance.refresh()
  assert.equal(netValueCalls.length, 2)
  assert.equal(distributionCalls.length, 2)

  await performance.selectRange('net-value', 'n')
  performance.close()
  performance.open('000001')

  assert.equal(performance.model.value.activeView, 'cumulative-returns')
  assert.equal(performance.model.value.netValue.selectedRange, '6y')
  assert.equal(performance.model.value.netValue.chart, undefined)
  assert.equal(performance.model.value.reinvestedNetValue.selectedRange, '6y')
  assert.equal(performance.model.value.reinvestedNetValue.chart, undefined)
  assert.equal(performance.model.value.distribution.hasLoaded, false)
})

test('shares history requests with the metrics session in both directions', async () => {
  const distributionCalls: string[] = []
  const netValueCalls: FundHistoryRange[] = []
  const historyDataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      distributionCalls.push(fundCode)
      return distributionResult(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      netValueCalls.push(range)
      return netValueResult(fundCode, range)
    },
  })
  const performance = useFundPerformance(ref(true), { historyDataSource })
  const metrics = useFundMetrics(
    historyDataSource,
    useFundBenchmarkDataSource({
      load: async (endDate) => ({
        endDate,
        indexCode: 'H00300',
        indexName: '沪深300全收益指数',
        issues: [],
        points: [
          { date: '2025-07-31', value: 1000 },
          { date: '2026-07-29', value: 1100 },
        ],
        startDate: '20041231',
      }),
    }),
  )
  performance.open('161725')
  metrics.open('161725')

  await metrics.activate()
  assert.deepEqual(distributionCalls, ['161725'])
  assert.deepEqual(netValueCalls, ['ln'])

  await performance.selectView('reinvested-net-value')
  assert.deepEqual(distributionCalls, ['161725'])
  assert.deepEqual(netValueCalls, ['ln'])

  performance.open('000001')
  metrics.open('000001')
  await performance.selectView('reinvested-net-value')
  assert.deepEqual(distributionCalls, ['161725', '000001'])
  assert.deepEqual(netValueCalls, ['ln', 'ln'])

  await metrics.activate()
  assert.deepEqual(distributionCalls, ['161725', '000001'])
  assert.deepEqual(netValueCalls, ['ln', 'ln'])
})

test('merges concurrent relative benchmark and metrics force refreshes', async () => {
  let benchmarkCalls = 0
  const distributionCalls: string[] = []
  const netValueCalls: FundHistoryRange[] = []
  const historyDataSource = useFundHistoryDataSource({
    loadDistribution: async (fundCode) => {
      distributionCalls.push(fundCode)
      return distributionResult(fundCode)
    },
    loadNetValueHistory: async (fundCode, range) => {
      netValueCalls.push(range)
      return netValueResult(fundCode, range)
    },
  })
  const benchmarkDataSource = useFundBenchmarkDataSource({
    load: async (endDate) => {
      benchmarkCalls += 1
      return benchmarkResult(endDate)
    },
  })
  const performance = useFundPerformance(ref(true), {
    benchmarkDataSource,
    historyDataSource,
  })
  const metrics = useFundMetrics(historyDataSource, benchmarkDataSource)
  performance.open('161725')
  metrics.open('161725')
  await Promise.all([performance.selectView('relative-benchmark'), metrics.activate()])

  assert.equal(benchmarkCalls, 1)
  assert.deepEqual(netValueCalls, ['ln'])
  assert.deepEqual(distributionCalls, ['161725'])

  await Promise.all([performance.refresh(), metrics.refresh()])
  assert.equal(benchmarkCalls, 2)
  assert.deepEqual(netValueCalls, ['ln', 'ln'])
  assert.deepEqual(distributionCalls, ['161725', '161725'])
})

function cumulativeResult(
  fundCode: string,
  referenceIndexCode: string,
  range: FundHistoryRange,
): FundCumulativeReturns {
  return {
    fundCode,
    maximumDrawdownPercent: 10,
    points: [
      {
        date: '2026-07-29',
        fundTypeYieldPercent: 1,
        fundYieldPercent: 2,
        referenceIndexYieldPercent: 3,
      },
    ],
    range,
    referenceIndexCode,
  }
}

function netValueResult(fundCode: string, range: FundHistoryRange): FundNetValueHistory {
  return {
    events: [],
    fundCode,
    points: [
      {
        cumulativeNetValue: 1,
        dailyGrowthPercent: 0,
        date: '2026-01-29',
        unitNetValue: 1,
      },
      {
        cumulativeNetValue: 1.1,
        dailyGrowthPercent: 1,
        date: '2026-07-29',
        unitNetValue: 1.1,
      },
    ],
    range,
  }
}

function benchmarkResult(endDate: string) {
  return {
    endDate,
    indexCode: 'H00300' as const,
    indexName: '沪深300全收益指数' as const,
    issues: [],
    points: [
      { date: '2004-12-31', value: 1000 },
      { date: '2026-01-29', value: 2000 },
      { date: '2026-07-29', value: 2100 },
    ],
    startDate: '20041231' as const,
  }
}

function distributionResult(fundCode: string): FundDistributionHistory {
  return {
    conversions: [{ conversionDate: '2020-12-15', ratio: 1.005444122 }],
    dividends: [
      {
        dividendPerTenUnits: 0.45,
        equityRecordDate: '2021-12-31',
        exDividendDate: '2021-12-31',
        paymentDate: '2022-01-05',
      },
    ],
    fundCode,
  }
}

function basicInfo(
  code: string,
  trackingIndexCode: string | null = null,
  trackingIndexName: string | null = null,
): FundBasicInfo {
  return {
    code,
    companyName: null,
    custodyFeePercent: null,
    dailyPurchaseLimitYuan: null,
    establishedDate: null,
    fundType: null,
    managementFeePercent: null,
    minimumPurchaseAmountYuan: null,
    morningstarRating: null,
    netAssetsDate: null,
    netAssetsYuan: null,
    purchaseConfirmationDays: null,
    purchaseFeePercent: null,
    purchaseStatus: null,
    redemptionConfirmationDays: null,
    redemptionFundsArrivalDays: null,
    redemptionStatus: null,
    riskLevel: null,
    salesServiceFeePercent: null,
    shanghaiRating: null,
    standardPurchaseFeePercent: null,
    trackingError: null,
    trackingIndexCode,
    trackingIndexName,
  }
}
