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
import type { LoadFundCumulativeReturns } from '../models/fundCumulativeReturnsChart'
import type { FundPerformanceAction } from '../models/fundPerformancePanel'
import type { FundPerformanceView } from '../models/fundPerformanceView'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
import { fundPerformancePanelRegistry } from '../config/fundPerformancePanelRegistry'
import {
  type FundBenchmarkDataSource,
  type LoadFundBenchmarkHistory,
  useFundBenchmarkDataSource,
} from './useFundBenchmarkDataSource'
import { createFundPerformancePanelAdapters } from './createFundPerformancePanelAdapters'
import { type FundHistoryDataSource, useFundHistoryDataSource } from './useFundHistoryDataSource'
import type { LoadFundDistribution } from '../models/fundDistributionTableModel'
import type { LoadFundNetValueHistory } from '../models/fundNetValueChart'

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
  const adapters = createFundPerformancePanelAdapters({
    benchmarkDataSource,
    historyDataSource,
    loadCumulativeReturns: options.loadCumulativeReturns,
  })
  const activeView = ref<FundPerformanceView>('cumulative-returns')
  const currentFundCode = ref<string>()
  const basicInfo = shallowRef<FundBasicInfo>()

  const model = computed<FundPerformanceSectionModel>(() => ({
    activeView: activeView.value,
    isVisible: toValue(isVisible),
    panels: fundPerformancePanelRegistry.map(({ adapterKey }) => adapters[adapterKey].model.value),
  }))

  function open(code: string): void {
    currentFundCode.value = code
    basicInfo.value = undefined
    activeView.value = 'cumulative-returns'
    for (const { adapterKey } of fundPerformancePanelRegistry) {
      adapters[adapterKey].initialize(code)
    }
  }

  function close(): void {
    currentFundCode.value = undefined
    basicInfo.value = undefined
    for (const { adapterKey } of fundPerformancePanelRegistry) {
      adapters[adapterKey].close()
    }
  }

  async function updateBasicInfo(code: string, value: FundBasicInfo): Promise<void> {
    if (code !== currentFundCode.value) return
    basicInfo.value = value
    if (activeView.value === 'cumulative-returns') {
      await adapters['cumulative-returns'].updateBasicInfo(code, value)
    }
  }

  async function dispatch(action: FundPerformanceAction): Promise<void> {
    switch (action.type) {
      case 'select-view':
        activeView.value = action.view
        if (action.view === 'cumulative-returns') {
          const code = currentFundCode.value
          const info = basicInfo.value
          if (code && info) await adapters['cumulative-returns'].updateBasicInfo(code, info)
        } else {
          await adapters[action.view].activate()
        }
        return
      case 'select-range':
        switch (action.view) {
          case 'cumulative-returns':
            await adapters['cumulative-returns'].selectRange(action.range)
            return
          case 'cumulative-excess-return':
            await adapters['cumulative-excess-return'].selectRange(action.range)
            return
          case 'drawdown-comparison':
            await adapters['drawdown-comparison'].selectRange(action.range)
            return
          case 'net-value':
            await adapters['net-value'].selectRange(action.range)
            return
          case 'reinvested-net-value':
            await adapters['reinvested-net-value'].selectRange(action.range)
            return
          case 'rolling-excess-return':
            await adapters['rolling-excess-return'].selectRange(action.range)
            return
        }
        return
      case 'select-reference-index':
        await adapters['cumulative-returns'].selectReferenceIndex(action.code)
        return
      case 'activate-panel':
        if (action.panelId === 'cumulative-returns') {
          const code = currentFundCode.value
          const info = basicInfo.value
          if (code && info) await adapters['cumulative-returns'].updateBasicInfo(code, info)
        } else {
          await adapters[action.panelId].activate()
        }
        return
      case 'retry-panel':
        await adapters[action.panelId].retry()
        return
    }
  }

  async function refresh(): Promise<void> {
    if (!toValue(isVisible)) return
    await Promise.all([adapters[activeView.value].refresh(), adapters.distribution.refresh()])
  }

  if (getCurrentScope() && (ownsHistoryDataSource || ownsBenchmarkDataSource)) {
    onScopeDispose(() => {
      if (ownsBenchmarkDataSource) benchmarkDataSource.dispose()
      if (ownsHistoryDataSource) historyDataSource.dispose()
    })
  }

  return {
    close,
    dispatch,
    model,
    open,
    refresh,
    updateBasicInfo,
  }
}
