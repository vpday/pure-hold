import { computed, type ComputedRef } from 'vue'

import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import { fundDrawdownRangeOptions } from '../config/fundDrawdownRangeOptions'
import { fundHistoryRangeOptions } from '../config/fundHistoryRangeOptions'
import { fundRollingExcessRangeOptions } from '../config/fundRollingExcessRangeOptions'
import type {
  FundCumulativeExcessReturnPanelModel,
  FundCumulativeReturnsPanelModel,
  FundDistributionPanelModel,
  FundDrawdownComparisonPanelModel,
  FundNetValuePanelModel,
  FundReinvestedNetValuePanelModel,
  FundRollingExcessReturnPanelModel,
} from '../models/fundPerformancePanel'
import type { FundDrawdownRange } from '../models/fundDrawdownComparison'
import type { LoadFundCumulativeReturns } from '../models/fundCumulativeReturnsChart'
import type { FundRollingExcessRange } from '../models/fundRollingExcessReturn'
import { toFundCumulativeReturnsChartModel } from '../presenters/toFundCumulativeReturnsChartModel'
import { toFundDistributionTableModel } from '../presenters/toFundDistributionTableModel'
import { toFundDrawdownComparisonChartModel } from '../presenters/toFundDrawdownComparisonChartModel'
import { toFundNetValueChartModel } from '../presenters/toFundNetValueChartModel'
import { toFundCumulativeExcessReturnChartModel } from '../presenters/toFundCumulativeExcessReturnChartModel'
import { toFundReinvestedNavChartModel } from '../presenters/toFundReinvestedNavChartModel'
import { toFundRollingExcessReturnChartModel } from '../presenters/toFundRollingExcessReturnChartModel'
import { useFundCumulativeExcessReturn } from './useFundCumulativeExcessReturn'
import { useFundCumulativeReturns } from './useFundCumulativeReturns'
import { useFundDistribution } from './useFundDistribution'
import { useFundDrawdownComparison } from './useFundDrawdownComparison'
import type { FundBenchmarkDataSource } from './useFundBenchmarkDataSource'
import type { FundHistoryDataSource } from './useFundHistoryDataSource'
import { useFundNetValueHistory } from './useFundNetValueHistory'
import { useFundReinvestedNavHistory } from './useFundReinvestedNavHistory'
import { useFundRollingExcessReturn } from './useFundRollingExcessReturn'

interface FundPerformancePanelAdapter<TModel> {
  readonly model: ComputedRef<TModel>
  initialize(code: string): void
  activate(): Promise<void>
  close(): void
  refresh(): Promise<void>
  retry(): Promise<void>
}

export interface FundCumulativeReturnsPanelAdapter extends FundPerformancePanelAdapter<FundCumulativeReturnsPanelModel> {
  selectRange(range: FundHistoryRange): Promise<void>
  selectReferenceIndex(code: string): Promise<void>
  updateBasicInfo(code: string, value: FundBasicInfo): Promise<void>
}

export interface FundHistoryPanelAdapter<TModel> extends FundPerformancePanelAdapter<TModel> {
  selectRange(range: FundHistoryRange): Promise<void>
}

export interface FundCumulativeExcessReturnPanelAdapter extends FundHistoryPanelAdapter<FundCumulativeExcessReturnPanelModel> {}

export interface FundReinvestedNetValuePanelAdapter extends FundHistoryPanelAdapter<FundReinvestedNetValuePanelModel> {}

export interface FundRollingExcessReturnPanelAdapter extends FundPerformancePanelAdapter<FundRollingExcessReturnPanelModel> {
  selectRange(range: FundRollingExcessRange): Promise<void>
}

export interface FundDrawdownComparisonPanelAdapter extends FundPerformancePanelAdapter<FundDrawdownComparisonPanelModel> {
  selectRange(range: FundDrawdownRange): Promise<void>
}

export interface FundDistributionPanelAdapter extends FundPerformancePanelAdapter<FundDistributionPanelModel> {}

export interface FundPerformancePanelAdapterMap {
  readonly 'cumulative-returns': FundCumulativeReturnsPanelAdapter
  readonly 'cumulative-excess-return': FundCumulativeExcessReturnPanelAdapter
  readonly 'rolling-excess-return': FundRollingExcessReturnPanelAdapter
  readonly 'drawdown-comparison': FundDrawdownComparisonPanelAdapter
  readonly 'net-value': FundHistoryPanelAdapter<FundNetValuePanelModel>
  readonly 'reinvested-net-value': FundReinvestedNetValuePanelAdapter
  readonly distribution: FundDistributionPanelAdapter
}

export interface CreateFundPerformancePanelAdaptersOptions {
  readonly benchmarkDataSource: FundBenchmarkDataSource
  readonly historyDataSource: FundHistoryDataSource
  readonly loadCumulativeReturns?: LoadFundCumulativeReturns
}

export function createFundPerformancePanelAdapters(
  options: CreateFundPerformancePanelAdaptersOptions,
): FundPerformancePanelAdapterMap {
  const cumulativeReturns = useFundCumulativeReturns(options.loadCumulativeReturns)
  const distribution = useFundDistribution(options.historyDataSource)
  const drawdownComparison = useFundDrawdownComparison(
    options.historyDataSource,
    options.benchmarkDataSource,
  )
  const netValueHistory = useFundNetValueHistory(options.historyDataSource)
  const cumulativeExcessReturn = useFundCumulativeExcessReturn(
    options.historyDataSource,
    options.benchmarkDataSource,
  )
  const reinvestedNavHistory = useFundReinvestedNavHistory(options.historyDataSource)
  const rollingExcessReturn = useFundRollingExcessReturn(
    options.historyDataSource,
    options.benchmarkDataSource,
  )

  const cumulativeReturnsReferenceIndex = computed(() =>
    cumulativeReturns.referenceIndexOptions.value.find(
      ({ code }) => code === cumulativeReturns.selectedReferenceIndexCode.value,
    ),
  )
  const cumulativeReturnsRangeLabel = computed(
    () =>
      fundHistoryRangeOptions.find(({ value }) => value === cumulativeReturns.selectedRange.value)
        ?.label,
  )
  const cumulativeExcessReturnRangeLabel = computed(
    () =>
      fundHistoryRangeOptions.find(
        ({ value }) => value === cumulativeExcessReturn.selectedRange.value,
      )?.label,
  )
  const drawdownRangeLabel = computed(
    () =>
      fundDrawdownRangeOptions.find(({ value }) => value === drawdownComparison.selectedRange.value)
        ?.label,
  )
  const rollingExcessRangeLabel = computed(
    () =>
      fundRollingExcessRangeOptions.find(
        ({ value }) => value === rollingExcessReturn.selectedRange.value,
      )?.label,
  )

  return {
    'cumulative-returns': {
      model: computed<FundCumulativeReturnsPanelModel>(() => {
        const data = cumulativeReturns.data.value
        const referenceIndex = cumulativeReturnsReferenceIndex.value
        const rangeLabel = cumulativeReturnsRangeLabel.value
        return {
          chart:
            data && referenceIndex && rangeLabel
              ? toFundCumulativeReturnsChartModel(data, referenceIndex.name, rangeLabel)
              : undefined,
          error: cumulativeReturns.error.value,
          id: 'cumulative-returns',
          isLoading: cumulativeReturns.isLoading.value,
          kind: 'chart',
          referenceIndexOptions: cumulativeReturns.referenceIndexOptions.value,
          selectedRange: cumulativeReturns.selectedRange.value,
          selectedReferenceIndexCode: cumulativeReturns.selectedReferenceIndexCode.value,
        }
      }),
      activate: async () => undefined,
      close: () => cumulativeReturns.close(),
      initialize: () => cumulativeReturns.close(),
      refresh: () => cumulativeReturns.refresh(),
      retry: () => cumulativeReturns.retry(),
      selectRange: (range: FundHistoryRange) => cumulativeReturns.selectRange(range),
      selectReferenceIndex: (code: string) => cumulativeReturns.selectReferenceIndex(code),
      updateBasicInfo: (code: string, value: FundBasicInfo) =>
        cumulativeReturns.initialize(code, value),
    },
    'cumulative-excess-return': {
      model: computed<FundCumulativeExcessReturnPanelModel>(() => {
        const data = cumulativeExcessReturn.data.value
        const rangeLabel = cumulativeExcessReturnRangeLabel.value
        return {
          chart:
            data && rangeLabel
              ? toFundCumulativeExcessReturnChartModel(data, rangeLabel)
              : undefined,
          error: cumulativeExcessReturn.error.value,
          id: 'cumulative-excess-return',
          isLoading: cumulativeExcessReturn.isLoading.value,
          kind: 'chart',
          selectedRange: cumulativeExcessReturn.selectedRange.value,
          warning: cumulativeExcessReturn.warning.value,
        }
      }),
      activate: () => cumulativeExcessReturn.activate(),
      close: () => cumulativeExcessReturn.close(),
      initialize: (code: string) => cumulativeExcessReturn.initialize(code),
      refresh: () => cumulativeExcessReturn.refresh(),
      retry: () => cumulativeExcessReturn.retry(),
      selectRange: async (range: FundHistoryRange) => {
        cumulativeExcessReturn.selectRange(range)
      },
    },
    'drawdown-comparison': {
      model: computed<FundDrawdownComparisonPanelModel>(() => {
        const data = drawdownComparison.data.value
        const rangeLabel = drawdownRangeLabel.value
        return {
          chart:
            data && rangeLabel ? toFundDrawdownComparisonChartModel(data, rangeLabel) : undefined,
          error: drawdownComparison.error.value,
          id: 'drawdown-comparison',
          isLoading: drawdownComparison.isLoading.value,
          kind: 'chart',
          selectedRange: drawdownComparison.selectedRange.value,
          warning: drawdownComparison.warning.value,
        }
      }),
      activate: () => drawdownComparison.activate(),
      close: () => drawdownComparison.close(),
      initialize: (code: string) => drawdownComparison.initialize(code),
      refresh: () => drawdownComparison.refresh(),
      retry: () => drawdownComparison.retry(),
      selectRange: async (range: FundDrawdownRange) => {
        drawdownComparison.selectRange(range)
      },
    },
    distribution: {
      model: computed<FundDistributionPanelModel>(() => {
        const data = distribution.data.value
        const table = data ? toFundDistributionTableModel(data) : { conversions: [], dividends: [] }
        return {
          ...table,
          error: distribution.error.value,
          hasLoaded: distribution.hasLoaded.value,
          id: 'distribution',
          isLoading: distribution.isLoading.value,
          kind: 'distribution',
        }
      }),
      activate: () => distribution.activate(),
      close: () => distribution.close(),
      initialize: (code: string) => distribution.initialize(code),
      refresh: () => distribution.refresh(),
      retry: () => distribution.retry(),
    },
    'net-value': {
      model: computed<FundNetValuePanelModel>(() => ({
        chart: netValueHistory.data.value
          ? toFundNetValueChartModel(netValueHistory.data.value)
          : undefined,
        error: netValueHistory.error.value,
        id: 'net-value',
        isLoading: netValueHistory.isLoading.value,
        kind: 'chart',
        selectedRange: netValueHistory.selectedRange.value,
      })),
      activate: () => netValueHistory.activate(),
      close: () => netValueHistory.close(),
      initialize: (code: string) => netValueHistory.initialize(code),
      refresh: () => netValueHistory.refresh(),
      retry: () => netValueHistory.retry(),
      selectRange: (range: FundHistoryRange) => netValueHistory.selectRange(range),
    },
    'reinvested-net-value': {
      model: computed<FundReinvestedNetValuePanelModel>(() => ({
        chart: reinvestedNavHistory.selectedData.value
          ? toFundReinvestedNavChartModel(reinvestedNavHistory.selectedData.value)
          : undefined,
        error: reinvestedNavHistory.error.value,
        id: 'reinvested-net-value',
        isLoading: reinvestedNavHistory.isLoading.value,
        kind: 'chart',
        selectedRange: reinvestedNavHistory.selectedRange.value,
        warning: reinvestedNavHistory.data.value?.issues.length
          ? '部分净值、分红或份额折算数据异常，已忽略异常记录'
          : '',
      })),
      activate: () => reinvestedNavHistory.activate(),
      close: () => reinvestedNavHistory.close(),
      initialize: (code: string) => reinvestedNavHistory.initialize(code),
      refresh: () => reinvestedNavHistory.refresh(),
      retry: () => reinvestedNavHistory.retry(),
      selectRange: async (range: FundHistoryRange) => {
        reinvestedNavHistory.selectRange(range)
      },
    },
    'rolling-excess-return': {
      model: computed<FundRollingExcessReturnPanelModel>(() => {
        const data = rollingExcessReturn.data.value
        const rangeLabel = rollingExcessRangeLabel.value
        return {
          chart:
            data && rangeLabel ? toFundRollingExcessReturnChartModel(data, rangeLabel) : undefined,
          error: rollingExcessReturn.error.value,
          id: 'rolling-excess-return',
          isLoading: rollingExcessReturn.isLoading.value,
          kind: 'chart',
          selectedRange: rollingExcessReturn.selectedRange.value,
          warning: rollingExcessReturn.warning.value,
        }
      }),
      activate: () => rollingExcessReturn.activate(),
      close: () => rollingExcessReturn.close(),
      initialize: (code: string) => rollingExcessReturn.initialize(code),
      refresh: () => rollingExcessReturn.refresh(),
      retry: () => rollingExcessReturn.retry(),
      selectRange: async (range: FundRollingExcessRange) => {
        rollingExcessReturn.selectRange(range)
      },
    },
  } satisfies FundPerformancePanelAdapterMap
}
