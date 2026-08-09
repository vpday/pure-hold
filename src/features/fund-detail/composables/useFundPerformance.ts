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
import { fundHistoryRangeOptions } from '../config/fundHistoryRangeOptions'
import type { LoadFundCumulativeReturns } from '../models/fundCumulativeReturnsChart'
import type { LoadFundDistribution } from '../models/fundDistributionTableModel'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
import type { FundPerformanceView } from '../models/fundPerformanceView'
import type { LoadFundNetValueHistory } from '../models/fundNetValueChart'
import { toFundCumulativeReturnsChartModel } from '../presenters/toFundCumulativeReturnsChartModel'
import { toFundDistributionTableModel } from '../presenters/toFundDistributionTableModel'
import { toFundNetValueChartModel } from '../presenters/toFundNetValueChartModel'
import { toFundRelativeBenchmarkChartModel } from '../presenters/toFundRelativeBenchmarkChartModel'
import { toFundReinvestedNavChartModel } from '../presenters/toFundReinvestedNavChartModel'
import {
  type FundBenchmarkDataSource,
  type LoadFundBenchmarkHistory,
  useFundBenchmarkDataSource,
} from './useFundBenchmarkDataSource'
import { useFundCumulativeReturns } from './useFundCumulativeReturns'
import { useFundDistribution } from './useFundDistribution'
import { type FundHistoryDataSource, useFundHistoryDataSource } from './useFundHistoryDataSource'
import { useFundNetValueHistory } from './useFundNetValueHistory'
import { useFundRelativeBenchmark } from './useFundRelativeBenchmark'
import { useFundReinvestedNavHistory } from './useFundReinvestedNavHistory'

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
  const netValueHistory = useFundNetValueHistory(historyDataSource)
  const relativeBenchmark = useFundRelativeBenchmark(historyDataSource, benchmarkDataSource)
  const reinvestedNavHistory = useFundReinvestedNavHistory(historyDataSource)
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
  const selectedRelativeRangeOption = computed(() =>
    fundHistoryRangeOptions.find(({ value }) => value === relativeBenchmark.selectedRange.value),
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
  const relativeBenchmarkChart = computed(() => {
    const result = relativeBenchmark.data.value
    const rangeOption = selectedRelativeRangeOption.value
    return result && rangeOption
      ? toFundRelativeBenchmarkChartModel(result, rangeOption.label)
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
    relativeBenchmark: {
      chart: relativeBenchmarkChart.value,
      error: relativeBenchmark.error.value,
      isLoading: relativeBenchmark.isLoading.value,
      selectedRange: relativeBenchmark.selectedRange.value,
      warning: relativeBenchmark.warning.value,
    },
  }))

  function open(code: string): void {
    currentFundCode.value = code
    basicInfo.value = undefined
    activeView.value = 'cumulative-returns'
    cumulativeReturns.close()
    distribution.close()
    distribution.initialize(code)
    netValueHistory.close()
    netValueHistory.initialize(code)
    reinvestedNavHistory.close()
    reinvestedNavHistory.initialize(code)
    relativeBenchmark.close()
    relativeBenchmark.initialize(code)
  }

  function close(): void {
    currentFundCode.value = undefined
    basicInfo.value = undefined
    cumulativeReturns.close()
    distribution.close()
    netValueHistory.close()
    reinvestedNavHistory.close()
    relativeBenchmark.close()
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
    if (view === 'relative-benchmark') await relativeBenchmark.activate()
    else await (view === 'net-value' ? netValueHistory.activate() : reinvestedNavHistory.activate())
  }

  async function selectRange(view: FundPerformanceView, range: FundHistoryRange): Promise<void> {
    if (view === 'cumulative-returns') await cumulativeReturns.selectRange(range)
    else if (view === 'net-value') await netValueHistory.selectRange(range)
    else if (view === 'relative-benchmark') relativeBenchmark.selectRange(range)
    else reinvestedNavHistory.selectRange(range)
  }

  async function selectReferenceIndex(code: string): Promise<void> {
    await cumulativeReturns.selectReferenceIndex(code)
  }

  async function retry(view: FundPerformanceView): Promise<void> {
    if (view === 'cumulative-returns') await cumulativeReturns.retry()
    else if (view === 'net-value') await netValueHistory.retry()
    else if (view === 'relative-benchmark') await relativeBenchmark.retry()
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
          : view === 'relative-benchmark'
            ? relativeBenchmark.refresh()
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
