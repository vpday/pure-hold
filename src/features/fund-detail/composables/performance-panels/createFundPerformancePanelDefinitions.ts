import { computed } from 'vue'

import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo.ts'
import { fundDrawdownRangeOptions } from '../../config/fundDrawdownRangeOptions.ts'
import { fundHistoryRangeOptions } from '../../config/fundHistoryRangeOptions.ts'
import { fundRollingExcessRangeOptions } from '../../config/fundRollingExcessRangeOptions.ts'
import type { LoadFundCumulativeReturns } from '../../models/fundCumulativeReturnsChart.ts'
import type {
  FundCumulativeExcessReturnPanelModel,
  FundCumulativeReturnsPanelModel,
  FundDistributionPanelModel,
  FundDrawdownComparisonPanelModel,
  FundNetValuePanelModel,
  FundReinvestedNetValuePanelModel,
  FundRollingExcessReturnPanelModel,
} from '../../models/fundPerformancePanel.ts'
import { toFundCumulativeExcessReturnChartModel } from '../../presenters/toFundCumulativeExcessReturnChartModel.ts'
import { toFundCumulativeReturnsChartModel } from '../../presenters/toFundCumulativeReturnsChartModel.ts'
import { toFundDistributionTableModel } from '../../presenters/toFundDistributionTableModel.ts'
import { toFundDrawdownComparisonChartModel } from '../../presenters/toFundDrawdownComparisonChartModel.ts'
import { toFundNetValueChartModel } from '../../presenters/toFundNetValueChartModel.ts'
import { toFundReinvestedNavChartModel } from '../../presenters/toFundReinvestedNavChartModel.ts'
import { toFundRollingExcessReturnChartModel } from '../../presenters/toFundRollingExcessReturnChartModel.ts'
import {
  cumulativeExcessReturnCalculation,
  drawdownComparisonCalculation,
  rollingExcessReturnCalculation,
} from '../fundComparisonCalculationAdapters.ts'
import { useFundCumulativeReturns } from '../useFundCumulativeReturns.ts'
import { useFundDistribution } from '../useFundDistribution.ts'
import type { FundBenchmarkDataSource } from '../useFundBenchmarkDataSource.ts'
import { useFundComparisonSession } from '../useFundComparisonSession.ts'
import type { FundHistoryDataSource } from '../useFundHistoryDataSource.ts'
import { useFundNetValueHistory } from '../useFundNetValueHistory.ts'
import { useFundReinvestedNavHistory } from '../useFundReinvestedNavHistory.ts'
import type {
  AnyFundPerformancePanelDefinition,
  FundPerformancePanelDefinition,
} from './fundPerformancePanelDefinition.ts'

export interface CreateFundPerformancePanelDefinitionsOptions {
  readonly benchmarkDataSource: FundBenchmarkDataSource
  readonly historyDataSource: FundHistoryDataSource
  readonly loadCumulativeReturns?: LoadFundCumulativeReturns
}

export function createFundPerformancePanelDefinitions(
  options: CreateFundPerformancePanelDefinitionsOptions,
): readonly AnyFundPerformancePanelDefinition[] {
  return [
    createCumulativeReturnsDefinition(options.loadCumulativeReturns),
    createCumulativeExcessReturnDefinition(options),
    createRollingExcessReturnDefinition(options),
    createDrawdownComparisonDefinition(options),
    createNetValueDefinition(options.historyDataSource),
    createReinvestedNetValueDefinition(options.historyDataSource),
    createDistributionDefinition(options.historyDataSource),
  ]
}

function createCumulativeReturnsDefinition(
  load?: LoadFundCumulativeReturns,
): FundPerformancePanelDefinition<'cumulative-returns'> {
  const session = useFundCumulativeReturns(load)
  const referenceIndex = computed(() =>
    session.referenceIndexOptions.value.find(
      ({ code }) => code === session.selectedReferenceIndexCode.value,
    ),
  )
  const rangeLabel = computed(
    () => fundHistoryRangeOptions.find(({ value }) => value === session.selectedRange.value)?.label,
  )

  return {
    descriptor: {
      defaultView: true,
      id: 'cumulative-returns',
      kind: 'chart',
      label: '累计收益',
    },
    model: computed<FundCumulativeReturnsPanelModel>(() => {
      const data = session.data.value
      return {
        chart:
          data && referenceIndex.value && rangeLabel.value
            ? toFundCumulativeReturnsChartModel(data, referenceIndex.value.name, rangeLabel.value)
            : undefined,
        error: session.error.value,
        id: 'cumulative-returns',
        isLoading: session.isLoading.value,
        kind: 'chart',
        referenceIndexOptions: session.referenceIndexOptions.value,
        selectedRange: session.selectedRange.value,
        selectedReferenceIndexCode: session.selectedReferenceIndexCode.value,
      }
    }),
    activate: async () => undefined,
    close: () => session.close(),
    dispatch: async (action) => {
      if (action.type === 'select-range') await session.selectRange(action.range)
      else await session.selectReferenceIndex(action.code)
    },
    open: () => session.close(),
    refresh: () => session.refresh(),
    retry: () => session.retry(),
    updateBasicInfo: (fundCode: string, value: FundBasicInfo) =>
      session.initialize(fundCode, value),
  }
}

function createCumulativeExcessReturnDefinition(
  options: CreateFundPerformancePanelDefinitionsOptions,
): FundPerformancePanelDefinition<'cumulative-excess-return'> {
  const session = useFundComparisonSession(
    options.historyDataSource,
    options.benchmarkDataSource,
    cumulativeExcessReturnCalculation,
  )
  const rangeLabel = computed(
    () => fundHistoryRangeOptions.find(({ value }) => value === session.selectedRange.value)?.label,
  )

  return {
    descriptor: {
      defaultView: false,
      id: 'cumulative-excess-return',
      kind: 'chart',
      label: '累计超额',
    },
    model: computed<FundCumulativeExcessReturnPanelModel>(() => ({
      chart:
        session.data.value && rangeLabel.value
          ? toFundCumulativeExcessReturnChartModel(session.data.value, rangeLabel.value)
          : undefined,
      error: session.error.value,
      id: 'cumulative-excess-return',
      isLoading: session.isLoading.value,
      kind: 'chart',
      selectedRange: session.selectedRange.value,
      warning: session.warning.value,
    })),
    activate: () => session.activate(),
    close: () => session.close(),
    dispatch: async (action) => session.selectRange(action.range),
    open: (fundCode) => session.initialize(fundCode),
    refresh: () => session.refresh(),
    retry: () => session.retry(),
  }
}

function createRollingExcessReturnDefinition(
  options: CreateFundPerformancePanelDefinitionsOptions,
): FundPerformancePanelDefinition<'rolling-excess-return'> {
  const session = useFundComparisonSession(
    options.historyDataSource,
    options.benchmarkDataSource,
    rollingExcessReturnCalculation,
  )
  const rangeLabel = computed(
    () =>
      fundRollingExcessRangeOptions.find(({ value }) => value === session.selectedRange.value)
        ?.label,
  )

  return {
    descriptor: {
      defaultView: false,
      id: 'rolling-excess-return',
      kind: 'chart',
      label: '滚动超额',
    },
    model: computed<FundRollingExcessReturnPanelModel>(() => ({
      chart:
        session.data.value && rangeLabel.value
          ? toFundRollingExcessReturnChartModel(session.data.value, rangeLabel.value)
          : undefined,
      error: session.error.value,
      id: 'rolling-excess-return',
      isLoading: session.isLoading.value,
      kind: 'chart',
      selectedRange: session.selectedRange.value,
      warning: session.warning.value,
    })),
    activate: () => session.activate(),
    close: () => session.close(),
    dispatch: async (action) => session.selectRange(action.range),
    open: (fundCode) => session.initialize(fundCode),
    refresh: () => session.refresh(),
    retry: () => session.retry(),
  }
}

function createDrawdownComparisonDefinition(
  options: CreateFundPerformancePanelDefinitionsOptions,
): FundPerformancePanelDefinition<'drawdown-comparison'> {
  const session = useFundComparisonSession(
    options.historyDataSource,
    options.benchmarkDataSource,
    drawdownComparisonCalculation,
  )
  const rangeLabel = computed(
    () =>
      fundDrawdownRangeOptions.find(({ value }) => value === session.selectedRange.value)?.label,
  )

  return {
    descriptor: {
      defaultView: false,
      id: 'drawdown-comparison',
      kind: 'chart',
      label: '回撤对比',
    },
    model: computed<FundDrawdownComparisonPanelModel>(() => ({
      chart:
        session.data.value && rangeLabel.value
          ? toFundDrawdownComparisonChartModel(session.data.value, rangeLabel.value)
          : undefined,
      error: session.error.value,
      id: 'drawdown-comparison',
      isLoading: session.isLoading.value,
      kind: 'chart',
      selectedRange: session.selectedRange.value,
      warning: session.warning.value,
    })),
    activate: () => session.activate(),
    close: () => session.close(),
    dispatch: async (action) => session.selectRange(action.range),
    open: (fundCode) => session.initialize(fundCode),
    refresh: () => session.refresh(),
    retry: () => session.retry(),
  }
}

function createNetValueDefinition(
  historyDataSource: FundHistoryDataSource,
): FundPerformancePanelDefinition<'net-value'> {
  const session = useFundNetValueHistory(historyDataSource)

  return {
    descriptor: {
      defaultView: false,
      id: 'net-value',
      kind: 'chart',
      label: '净值走势',
    },
    model: computed<FundNetValuePanelModel>(() => ({
      chart: session.data.value ? toFundNetValueChartModel(session.data.value) : undefined,
      error: session.error.value,
      id: 'net-value',
      isLoading: session.isLoading.value,
      kind: 'chart',
      selectedRange: session.selectedRange.value,
    })),
    activate: () => session.activate(),
    close: () => session.close(),
    dispatch: (action) => session.selectRange(action.range),
    open: (fundCode) => session.initialize(fundCode),
    refresh: () => session.refresh(),
    retry: () => session.retry(),
  }
}

function createReinvestedNetValueDefinition(
  historyDataSource: FundHistoryDataSource,
): FundPerformancePanelDefinition<'reinvested-net-value'> {
  const session = useFundReinvestedNavHistory(historyDataSource)

  return {
    descriptor: {
      defaultView: false,
      id: 'reinvested-net-value',
      kind: 'chart',
      label: '复权净值',
    },
    model: computed<FundReinvestedNetValuePanelModel>(() => ({
      chart: session.selectedData.value
        ? toFundReinvestedNavChartModel(session.selectedData.value)
        : undefined,
      error: session.error.value,
      id: 'reinvested-net-value',
      isLoading: session.isLoading.value,
      kind: 'chart',
      selectedRange: session.selectedRange.value,
      warning: session.data.value?.issues.length
        ? '部分净值、分红或份额折算数据异常，已忽略异常记录'
        : '',
    })),
    activate: () => session.activate(),
    close: () => session.close(),
    dispatch: async (action) => session.selectRange(action.range),
    open: (fundCode) => session.initialize(fundCode),
    refresh: () => session.refresh(),
    retry: () => session.retry(),
  }
}

function createDistributionDefinition(
  historyDataSource: FundHistoryDataSource,
): FundPerformancePanelDefinition<'distribution'> {
  const session = useFundDistribution(historyDataSource)

  return {
    descriptor: {
      defaultView: false,
      id: 'distribution',
      kind: 'distribution',
      label: '分红送配',
    },
    model: computed<FundDistributionPanelModel>(() => {
      const table = session.data.value
        ? toFundDistributionTableModel(session.data.value)
        : { conversions: [], dividends: [] }
      return {
        ...table,
        error: session.error.value,
        hasLoaded: session.hasLoaded.value,
        id: 'distribution',
        isLoading: session.isLoading.value,
        kind: 'distribution',
      }
    }),
    activate: () => session.activate(),
    close: () => session.close(),
    dispatch: async () => undefined,
    open: (fundCode) => session.initialize(fundCode),
    refresh: () => session.refresh(),
    retry: () => session.retry(),
  }
}
