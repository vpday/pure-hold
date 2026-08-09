import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'

import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import { fundDrawdownRangeOptions } from '../config/fundDrawdownRangeOptions'
import { fundHistoryRangeOptions } from '../config/fundHistoryRangeOptions'
import { fundRollingExcessRangeOptions } from '../config/fundRollingExcessRangeOptions'
import type { LoadFundCumulativeReturns } from '../models/fundCumulativeReturnsChart'
import type { LoadFundDistribution } from '../models/fundDistributionTableModel'
import type { FundDrawdownRange } from '../models/fundDrawdownComparison'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
import type { FundPerformanceView } from '../models/fundPerformanceView'
import type { FundRollingExcessRange } from '../models/fundRollingExcessReturn'
import type { LoadFundNetValueHistory } from '../models/fundNetValueChart'
import { toFundCumulativeReturnsChartModel } from '../presenters/toFundCumulativeReturnsChartModel'
import { toFundDistributionTableModel } from '../presenters/toFundDistributionTableModel'
import { toFundDrawdownComparisonChartModel } from '../presenters/toFundDrawdownComparisonChartModel'
import { toFundNetValueChartModel } from '../presenters/toFundNetValueChartModel'
import { toFundCumulativeExcessReturnChartModel } from '../presenters/toFundCumulativeExcessReturnChartModel'
import { toFundReinvestedNavChartModel } from '../presenters/toFundReinvestedNavChartModel'
import { toFundRollingExcessReturnChartModel } from '../presenters/toFundRollingExcessReturnChartModel'
import {
  type FundBenchmarkDataSource,
  type LoadFundBenchmarkHistory,
  useFundBenchmarkDataSource,
} from './useFundBenchmarkDataSource'
import { useFundCumulativeReturns } from './useFundCumulativeReturns'
import { useFundDistribution } from './useFundDistribution'
import { useFundDrawdownComparison } from './useFundDrawdownComparison'
import { type FundHistoryDataSource, useFundHistoryDataSource } from './useFundHistoryDataSource'
import { useFundNetValueHistory } from './useFundNetValueHistory'
import { useFundCumulativeExcessReturn } from './useFundCumulativeExcessReturn'
import { useFundReinvestedNavHistory } from './useFundReinvestedNavHistory'
import { useFundRollingExcessReturn } from './useFundRollingExcessReturn'

interface UseFundPerformanceOptions {
  readonly benchmarkDataSource?: FundBenchmarkDataSource
  readonly historyDataSource?: FundHistoryDataSource
  readonly loadBenchmarkHistory?: LoadFundBenchmarkHistory
  readonly loadCumulativeReturns?: LoadFundCumulativeReturns
  readonly loadDistribution?: LoadFundDistribution
  readonly loadNetValueHistory?: LoadFundNetValueHistory
}

export function useFundPerformance(
  isVisible: MaybeRefOrGetter<boolean>,
  options: UseFundPerformanceOptions = {},
) {
  const ownsBenchmarkDataSource = !options.benchmarkDataSource
  const ownsHistoryDataSource = !options.historyDataSource
  const benchmarkDataSource =
    options.benchmarkDataSource ??
    useFundBenchmarkDataSource({ load: options.loadBenchmarkHistory })
  const historyDataSource =
    options.historyDataSource ??
    useFundHistoryDataSource({
      loadDistribution: options.loadDistribution,
      loadNetValueHistory: options.loadNetValueHistory,
    })
  const cumulativeReturns = useFundCumulativeReturns(options.loadCumulativeReturns)
  const distribution = useFundDistribution(historyDataSource)
  const drawdownComparison = useFundDrawdownComparison(historyDataSource, benchmarkDataSource)
  const netValueHistory = useFundNetValueHistory(historyDataSource)
  const cumulativeExcessReturn = useFundCumulativeExcessReturn(
    historyDataSource,
    benchmarkDataSource,
  )
  const reinvestedNavHistory = useFundReinvestedNavHistory(historyDataSource)
  const rollingExcessReturn = useFundRollingExcessReturn(historyDataSource, benchmarkDataSource)
  const activeView = ref<FundPerformanceView>('cumulative-returns')
  const currentFundCode = ref<string>()
  const basicInfo = shallowRef<FundBasicInfo>()

  const selectedReferenceIndex = computed(() =>
    cumulativeReturns.referenceIndexOptions.value.find(
      ({ code }) => code === cumulativeReturns.selectedReferenceIndexCode.value,
    ),
  )
  const selectedRangeOption = computed(() =>
    fundHistoryRangeOptions.find(({ value }) => value === cumulativeReturns.selectedRange.value),
  )
  const selectedCumulativeExcessReturnRangeOption = computed(() =>
    fundHistoryRangeOptions.find(
      ({ value }) => value === cumulativeExcessReturn.selectedRange.value,
    ),
  )
  const selectedDrawdownRangeOption = computed(() =>
    fundDrawdownRangeOptions.find(({ value }) => value === drawdownComparison.selectedRange.value),
  )
  const selectedRollingExcessRangeOption = computed(() =>
    fundRollingExcessRangeOptions.find(
      ({ value }) => value === rollingExcessReturn.selectedRange.value,
    ),
  )
  const cumulativeReturnsChart = computed(() => {
    const returns = cumulativeReturns.data.value
    const referenceIndex = selectedReferenceIndex.value
    const rangeOption = selectedRangeOption.value
    return returns && referenceIndex && rangeOption
      ? toFundCumulativeReturnsChartModel(returns, referenceIndex.name, rangeOption.label)
      : undefined
  })
  const netValueChart = computed(() => {
    const history = netValueHistory.data.value
    return history ? toFundNetValueChartModel(history) : undefined
  })
  const drawdownComparisonChart = computed(() => {
    const result = drawdownComparison.data.value
    const rangeOption = selectedDrawdownRangeOption.value
    return result && rangeOption
      ? toFundDrawdownComparisonChartModel(result, rangeOption.label)
      : undefined
  })
  const cumulativeExcessReturnChart = computed(() => {
    const result = cumulativeExcessReturn.data.value
    const rangeOption = selectedCumulativeExcessReturnRangeOption.value
    return result && rangeOption
      ? toFundCumulativeExcessReturnChartModel(result, rangeOption.label)
      : undefined
  })
  const rollingExcessReturnChart = computed(() => {
    const result = rollingExcessReturn.data.value
    const rangeOption = selectedRollingExcessRangeOption.value
    return result && rangeOption
      ? toFundRollingExcessReturnChartModel(result, rangeOption.label)
      : undefined
  })
  const reinvestedNetValueChart = computed(() => {
    const history = reinvestedNavHistory.selectedData.value
    return history ? toFundReinvestedNavChartModel(history) : undefined
  })
  const distributionTable = computed(() => {
    const history = distribution.data.value
    return history ? toFundDistributionTableModel(history) : { conversions: [], dividends: [] }
  })
  const model = computed<FundPerformanceSectionModel>(() => ({
    activeView: activeView.value,
    cumulativeReturns: {
      chart: cumulativeReturnsChart.value,
      error: cumulativeReturns.error.value,
      isLoading: cumulativeReturns.isLoading.value,
      referenceIndexOptions: cumulativeReturns.referenceIndexOptions.value,
      selectedRange: cumulativeReturns.selectedRange.value,
      selectedReferenceIndexCode: cumulativeReturns.selectedReferenceIndexCode.value,
    },
    distribution: {
      ...distributionTable.value,
      error: distribution.error.value,
      hasLoaded: distribution.hasLoaded.value,
      isLoading: distribution.isLoading.value,
    },
    drawdownComparison: {
      chart: drawdownComparisonChart.value,
      error: drawdownComparison.error.value,
      isLoading: drawdownComparison.isLoading.value,
      selectedRange: drawdownComparison.selectedRange.value,
      warning: drawdownComparison.warning.value,
    },
    isVisible: toValue(isVisible),
    netValue: {
      chart: netValueChart.value,
      error: netValueHistory.error.value,
      isLoading: netValueHistory.isLoading.value,
      selectedRange: netValueHistory.selectedRange.value,
    },
    reinvestedNetValue: {
      chart: reinvestedNetValueChart.value,
      error: reinvestedNavHistory.error.value,
      isLoading: reinvestedNavHistory.isLoading.value,
      selectedRange: reinvestedNavHistory.selectedRange.value,
      warning: reinvestedNavHistory.data.value?.issues.length
        ? '部分净值、分红或份额折算数据异常，已忽略异常记录'
        : '',
    },
    cumulativeExcessReturn: {
      chart: cumulativeExcessReturnChart.value,
      error: cumulativeExcessReturn.error.value,
      isLoading: cumulativeExcessReturn.isLoading.value,
      selectedRange: cumulativeExcessReturn.selectedRange.value,
      warning: cumulativeExcessReturn.warning.value,
    },
    rollingExcessReturn: {
      chart: rollingExcessReturnChart.value,
      error: rollingExcessReturn.error.value,
      isLoading: rollingExcessReturn.isLoading.value,
      selectedRange: rollingExcessReturn.selectedRange.value,
      warning: rollingExcessReturn.warning.value,
    },
  }))

  function open(code: string): void {
    currentFundCode.value = code
    basicInfo.value = undefined
    activeView.value = 'cumulative-returns'
    cumulativeReturns.close()
    distribution.close()
    distribution.initialize(code)
    drawdownComparison.close()
    drawdownComparison.initialize(code)
    netValueHistory.close()
    netValueHistory.initialize(code)
    reinvestedNavHistory.close()
    reinvestedNavHistory.initialize(code)
    cumulativeExcessReturn.close()
    cumulativeExcessReturn.initialize(code)
    rollingExcessReturn.close()
    rollingExcessReturn.initialize(code)
  }

  function close(): void {
    currentFundCode.value = undefined
    basicInfo.value = undefined
    cumulativeReturns.close()
    distribution.close()
    drawdownComparison.close()
    netValueHistory.close()
    reinvestedNavHistory.close()
    cumulativeExcessReturn.close()
    rollingExcessReturn.close()
  }

  async function updateBasicInfo(code: string, value: FundBasicInfo): Promise<void> {
    if (code !== currentFundCode.value) return
    basicInfo.value = value
    if (activeView.value === 'cumulative-returns') {
      await cumulativeReturns.initialize(code, value)
    }
  }

  async function selectView(view: FundPerformanceView): Promise<void> {
    activeView.value = view
    if (view === 'cumulative-returns') {
      const code = currentFundCode.value
      const info = basicInfo.value
      if (code && info) await cumulativeReturns.initialize(code, info)
      return
    }
    if (view === 'cumulative-excess-return') await cumulativeExcessReturn.activate()
    else if (view === 'rolling-excess-return') await rollingExcessReturn.activate()
    else if (view === 'drawdown-comparison') await drawdownComparison.activate()
    else await (view === 'net-value' ? netValueHistory.activate() : reinvestedNavHistory.activate())
  }

  async function selectRange(view: FundPerformanceView, range: FundHistoryRange): Promise<void> {
    if (view === 'cumulative-returns') await cumulativeReturns.selectRange(range)
    else if (view === 'net-value') await netValueHistory.selectRange(range)
    else if (view === 'cumulative-excess-return') cumulativeExcessReturn.selectRange(range)
    else if (view === 'rolling-excess-return')
      rollingExcessReturn.selectRange(range as FundRollingExcessRange)
    else if (view === 'drawdown-comparison')
      drawdownComparison.selectRange(range as FundDrawdownRange)
    else reinvestedNavHistory.selectRange(range)
  }

  async function selectReferenceIndex(code: string): Promise<void> {
    await cumulativeReturns.selectReferenceIndex(code)
  }

  async function retry(view: FundPerformanceView): Promise<void> {
    if (view === 'cumulative-returns') await cumulativeReturns.retry()
    else if (view === 'net-value') await netValueHistory.retry()
    else if (view === 'cumulative-excess-return') await cumulativeExcessReturn.retry()
    else if (view === 'rolling-excess-return') await rollingExcessReturn.retry()
    else if (view === 'drawdown-comparison') await drawdownComparison.retry()
    else await reinvestedNavHistory.retry()
  }

  async function activateDistribution(): Promise<void> {
    await distribution.activate()
  }

  async function retryDistribution(): Promise<void> {
    await distribution.retry()
  }

  async function refresh(): Promise<void> {
    if (!toValue(isVisible)) return
    const view = activeView.value
    const chartRefresh =
      view === 'cumulative-returns'
        ? cumulativeReturns.refresh()
        : view === 'net-value'
          ? netValueHistory.refresh()
          : view === 'cumulative-excess-return'
            ? cumulativeExcessReturn.refresh()
            : view === 'rolling-excess-return'
              ? rollingExcessReturn.refresh()
              : view === 'drawdown-comparison'
                ? drawdownComparison.refresh()
                : reinvestedNavHistory.refresh()
    await Promise.all([chartRefresh, distribution.refresh()])
  }

  if (getCurrentScope() && (ownsHistoryDataSource || ownsBenchmarkDataSource)) {
    onScopeDispose(() => {
      if (ownsBenchmarkDataSource) benchmarkDataSource.dispose()
      if (ownsHistoryDataSource) historyDataSource.dispose()
    })
  }

  return {
    activateDistribution,
    close,
    model,
    open,
    refresh,
    retry,
    retryDistribution,
    selectRange,
    selectReferenceIndex,
    selectView,
    updateBasicInfo,
  }
}
