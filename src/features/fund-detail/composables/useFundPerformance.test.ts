import assert from 'node:assert/strict'
import test from 'node:test'
import { ref } from 'vue'

import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo'
import type { FundCumulativeReturns } from '@/domains/funds/models/fundCumulativeReturns'
import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory'
import type {
  FundPerformancePanelId,
  FundPerformancePanelModel,
} from '../models/fundPerformancePanel'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
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
  assert.deepEqual(
    performance.model.value.panels.map(({ id }) => id),
    [
      'cumulative-returns',
      'cumulative-excess-return',
      'rolling-excess-return',
      'drawdown-comparison',
      'net-value',
      'reinvested-net-value',
      'distribution',
    ],
  )
  assert.equal(
    panel(performance.model.value, 'cumulative-returns').chart?.series[1].name,
    '中证白酒指数',
  )
  assert.deepEqual(cumulativeCalls[0]?.slice(0, 3), ['161725', '399997', '6y'])
  assert.equal(distributionCalls.length, 0)
  assert.equal(netValueCalls.length, 0)

  await performance.dispatch({ panelId: 'distribution', type: 'activate-panel' })
  await performance.dispatch({ type: 'select-view', view: 'net-value' })

  assert.equal(
    panel(performance.model.value, 'distribution').dividends[0]?.dividendPerTenUnits,
    '0.4500',
  )
  assert.equal(distributionCalls.length, 1)
  assert.equal(performance.model.value.activeView, 'net-value')
  assert.equal(panel(performance.model.value, 'net-value').chart?.series[0].values[0], 1)
  assert.deepEqual(netValueCalls[0]?.slice(0, 2), ['161725', '6y'])

  await performance.dispatch({ type: 'select-view', view: 'reinvested-net-value' })
  assert.equal(
    panel(performance.model.value, 'reinvested-net-value').chart?.series[1].name,
    '复权净值',
  )
  assert.equal(
    panel(performance.model.value, 'reinvested-net-value').warning,
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
  await performance.dispatch({ range: 'n', type: 'select-range', view: 'cumulative-returns' })
  await performance.dispatch({ panelId: 'cumulative-returns', type: 'retry-panel' })
  await performance.dispatch({ type: 'select-view', view: 'net-value' })
  await performance.dispatch({ range: '3n', type: 'select-range', view: 'net-value' })
  await performance.dispatch({ panelId: 'net-value', type: 'retry-panel' })
  await performance.dispatch({ type: 'select-view', view: 'reinvested-net-value' })
  await performance.dispatch({ range: 'y', type: 'select-range', view: 'reinvested-net-value' })
  await performance.dispatch({ panelId: 'reinvested-net-value', type: 'retry-panel' })

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

test('activates, filters, retries and resets the cumulative excess return session', async () => {
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
  await performance.dispatch({ type: 'select-view', view: 'cumulative-excess-return' })
  assert.equal(performance.model.value.activeView, 'cumulative-excess-return')
  assert.equal(
    panel(performance.model.value, 'cumulative-excess-return').chart?.series.name,
    '累计超额收益',
  )
  assert.deepEqual(netValueCalls, ['ln'])
  assert.deepEqual(distributionCalls, ['161725'])
  assert.equal(benchmarkCalls.length, 1)

  await performance.dispatch({
    range: 'ln',
    type: 'select-range',
    view: 'cumulative-excess-return',
  })
  assert.equal(panel(performance.model.value, 'cumulative-excess-return').selectedRange, 'ln')
  assert.deepEqual(netValueCalls, ['ln'])
  assert.equal(benchmarkCalls.length, 1)

  await performance.dispatch({ panelId: 'cumulative-excess-return', type: 'retry-panel' })
  assert.deepEqual(netValueCalls, ['ln', 'ln'])
  assert.equal(benchmarkCalls.length, 2)

  performance.open('000001')
  assert.equal(performance.model.value.activeView, 'cumulative-returns')
  assert.equal(panel(performance.model.value, 'cumulative-excess-return').selectedRange, '6y')
  assert.equal(panel(performance.model.value, 'cumulative-excess-return').chart, undefined)
})

test('activates drawdown comparison lazily and routes its local range lifecycle', async () => {
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
  assert.equal(panel(performance.model.value, 'drawdown-comparison').selectedRange, 'n')
  assert.deepEqual(benchmarkCalls, [])

  await performance.dispatch({ type: 'select-view', view: 'drawdown-comparison' })
  assert.equal(performance.model.value.activeView, 'drawdown-comparison')
  assert.equal(
    panel(performance.model.value, 'drawdown-comparison').chart?.series[0].name,
    '基金回撤',
  )
  assert.deepEqual(netValueCalls, ['ln'])
  assert.deepEqual(distributionCalls, ['161725'])
  assert.equal(benchmarkCalls.length, 1)

  await performance.dispatch({ range: '3n', type: 'select-range', view: 'drawdown-comparison' })
  assert.equal(panel(performance.model.value, 'drawdown-comparison').selectedRange, '3n')
  assert.deepEqual(netValueCalls, ['ln'])
  assert.equal(benchmarkCalls.length, 1)

  await performance.dispatch({ panelId: 'drawdown-comparison', type: 'retry-panel' })
  assert.deepEqual(netValueCalls, ['ln', 'ln'])
  assert.equal(benchmarkCalls.length, 2)

  performance.open('000001')
  assert.equal(performance.model.value.activeView, 'cumulative-returns')
  assert.equal(panel(performance.model.value, 'drawdown-comparison').selectedRange, 'n')
  assert.equal(panel(performance.model.value, 'drawdown-comparison').chart, undefined)
})

test('activates rolling excess lazily and routes range, retry, refresh and reopen', async () => {
  const isVisible = ref(true)
  const benchmarkCalls: string[] = []
  const distributionCalls: string[] = []
  const netValueCalls: FundHistoryRange[] = []
  const performance = useFundPerformance(isVisible, {
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
  assert.equal(panel(performance.model.value, 'rolling-excess-return').selectedRange, 'n')
  assert.deepEqual(benchmarkCalls, [])

  await performance.dispatch({ type: 'select-view', view: 'rolling-excess-return' })
  assert.equal(performance.model.value.activeView, 'rolling-excess-return')
  assert.equal(
    panel(performance.model.value, 'rolling-excess-return').chart?.series.name,
    '滚动12个月超额收益',
  )
  assert.deepEqual(netValueCalls, ['ln'])
  assert.deepEqual(distributionCalls, ['161725'])
  assert.equal(benchmarkCalls.length, 1)

  await performance.dispatch({ range: 'ln', type: 'select-range', view: 'rolling-excess-return' })
  assert.equal(panel(performance.model.value, 'rolling-excess-return').selectedRange, 'ln')
  assert.deepEqual(netValueCalls, ['ln'])

  await performance.dispatch({ panelId: 'rolling-excess-return', type: 'retry-panel' })
  await performance.refresh()
  assert.deepEqual(netValueCalls, ['ln', 'ln', 'ln'])
  assert.equal(benchmarkCalls.length, 3)

  isVisible.value = false
  await performance.refresh()
  assert.deepEqual(netValueCalls, ['ln', 'ln', 'ln'])

  performance.open('000001')
  assert.equal(performance.model.value.activeView, 'cumulative-returns')
  assert.equal(panel(performance.model.value, 'rolling-excess-return').selectedRange, 'n')
  assert.equal(panel(performance.model.value, 'rolling-excess-return').chart, undefined)
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
  await performance.dispatch({ panelId: 'distribution', type: 'activate-panel' })
  await performance.dispatch({ type: 'select-view', view: 'net-value' })
  await performance.refresh()
  assert.equal(netValueCalls.length, 1)
  assert.equal(distributionCalls.length, 1)

  isVisible.value = true
  await performance.refresh()
  assert.equal(netValueCalls.length, 2)
  assert.equal(distributionCalls.length, 2)

  await performance.dispatch({ range: 'n', type: 'select-range', view: 'net-value' })
  performance.close()
  performance.open('000001')

  assert.equal(performance.model.value.activeView, 'cumulative-returns')
  assert.equal(panel(performance.model.value, 'net-value').selectedRange, '6y')
  assert.equal(panel(performance.model.value, 'net-value').chart, undefined)
  assert.equal(panel(performance.model.value, 'reinvested-net-value').selectedRange, '6y')
  assert.equal(panel(performance.model.value, 'reinvested-net-value').chart, undefined)
  assert.equal(panel(performance.model.value, 'distribution').hasLoaded, false)
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
  const benchmarkDataSource = useFundBenchmarkDataSource({
    load: async (endDate) => ({
      endDate,
      indexCode: 'H00300',
      indexName: '沪深300全收益指数',
      issues: [],
      points: [
        { date: '2025-07-29', value: 900 },
        { date: '2025-07-31', value: 1000 },
        { date: '2026-07-29', value: 1100 },
      ],
      startDate: '20041231',
    }),
  })
  const performance = useFundPerformance(ref(true), { benchmarkDataSource, historyDataSource })
  const metrics = useFundMetrics(historyDataSource, benchmarkDataSource)
  performance.open('161725')
  metrics.open('161725')

  await metrics.activate()
  assert.deepEqual(distributionCalls, ['161725'])
  assert.deepEqual(netValueCalls, ['ln'])

  await performance.dispatch({ type: 'select-view', view: 'rolling-excess-return' })
  assert.deepEqual(distributionCalls, ['161725'])
  assert.deepEqual(netValueCalls, ['ln'])

  await performance.dispatch({ type: 'select-view', view: 'reinvested-net-value' })
  assert.deepEqual(distributionCalls, ['161725'])
  assert.deepEqual(netValueCalls, ['ln'])

  performance.open('000001')
  metrics.open('000001')
  await performance.dispatch({ type: 'select-view', view: 'reinvested-net-value' })
  assert.deepEqual(distributionCalls, ['161725', '000001'])
  assert.deepEqual(netValueCalls, ['ln', 'ln'])

  await metrics.activate()
  assert.deepEqual(distributionCalls, ['161725', '000001'])
  assert.deepEqual(netValueCalls, ['ln', 'ln'])
})

test('merges concurrent cumulative excess return and metrics force refreshes', async () => {
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
  await Promise.all([
    performance.dispatch({ type: 'select-view', view: 'cumulative-excess-return' }),
    metrics.activate(),
  ])

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
        date: '2025-01-29',
        unitNetValue: 1,
      },
      {
        cumulativeNetValue: 1,
        dailyGrowthPercent: 0,
        date: '2025-07-29',
        unitNetValue: 1,
      },
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
      { date: '2025-01-29', value: 1800 },
      { date: '2025-07-29', value: 1900 },
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

function panel<TId extends FundPerformancePanelId>(
  model: FundPerformanceSectionModel,
  id: TId,
): Extract<FundPerformancePanelModel, { readonly id: TId }> {
  const value = model.panels.find((item) => item.id === id)
  assert.ok(value)
  return value as Extract<FundPerformancePanelModel, { readonly id: TId }>
}
