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
})

test('routes ranges and retries through the active performance session', async () => {
  const cumulativeCalls: unknown[][] = []
  const netValueCalls: unknown[][] = []
  const performance = useFundPerformance(ref(true), {
    loadCumulativeReturns: async (...args) => {
      cumulativeCalls.push(args)
      return cumulativeResult(args[0], args[1], args[2])
    },
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
    ],
  )
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

  await performance.activateDistribution()
  await performance.selectView('net-value')
  await metrics.activate()
  assert.deepEqual(distributionCalls, ['161725'])
  assert.deepEqual(netValueCalls, ['6y', 'ln'])

  await performance.selectRange('net-value', 'ln')
  assert.deepEqual(netValueCalls, ['6y', 'ln'])
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
        cumulativeNetValue: 2,
        dailyGrowthPercent: 1,
        date: '2026-07-29',
        unitNetValue: 1,
      },
    ],
    range,
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
