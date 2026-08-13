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
import type { LoadFundDistribution } from '../models/fundDistributionTableModel'
import type { LoadFundCumulativeReturns } from '../models/fundCumulativeReturnsChart'
import type { LoadFundNetValueHistory } from '../models/fundNetValueChart'
import type { FundPerformanceAction, FundPerformancePanelId } from '../models/fundPerformancePanel'
import type { FundPerformanceView } from '../models/fundPerformanceView'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
import { createFundPerformancePanelDefinitions } from './performance-panels/createFundPerformancePanelDefinitions'
import { resolveFundPerformancePanelDefinition } from './performance-panels/fundPerformancePanelDefinition'
import {
  type FundBenchmarkDataSource,
  type LoadFundBenchmarkHistory,
  useFundBenchmarkDataSource,
} from './useFundBenchmarkDataSource'
import { type FundHistoryDataSource, useFundHistoryDataSource } from './useFundHistoryDataSource'

interface UseFundPerformanceOptions {
  readonly benchmarkDataSource?: FundBenchmarkDataSource
  readonly historyDataSource?: FundHistoryDataSource
  readonly loadBenchmarkHistory?: LoadFundBenchmarkHistory
  readonly loadCumulativeReturns?: LoadFundCumulativeReturns
  readonly loadDistribution?: LoadFundDistribution
  readonly loadNetValueHistory?: LoadFundNetValueHistory
}

export function useFundPerformance(
  isSectionActive: MaybeRefOrGetter<boolean>,
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
  const definitions = createFundPerformancePanelDefinitions({
    benchmarkDataSource,
    historyDataSource,
    loadCumulativeReturns: options.loadCumulativeReturns,
  })
  const defaultDefinition = definitions.find(({ descriptor }) => descriptor.defaultView)
  if (!defaultDefinition || defaultDefinition.descriptor.kind !== 'chart') {
    throw new Error('Missing default fund performance chart')
  }
  const defaultView = defaultDefinition.descriptor.id
  const activeView = ref<FundPerformanceView>(defaultView)
  const currentFundCode = ref<string>()
  const basicInfo = shallowRef<FundBasicInfo>()

  const model = computed<FundPerformanceSectionModel>(() => ({
    activeView: activeView.value,
    descriptors: definitions.map(({ descriptor }) => descriptor),
    panels: definitions.map(({ model: panelModel }) => panelModel.value),
  }))

  function open(code: string): void {
    currentFundCode.value = code
    basicInfo.value = undefined
    activeView.value = defaultView
    for (const definition of definitions) definition.open(code)
  }

  function close(): void {
    currentFundCode.value = undefined
    basicInfo.value = undefined
    for (const definition of definitions) definition.close()
  }

  async function updateBasicInfo(code: string, value: FundBasicInfo): Promise<void> {
    if (code !== currentFundCode.value) return
    basicInfo.value = value
    await definitionFor(activeView.value).updateBasicInfo?.(code, value)
  }

  async function dispatch(action: FundPerformanceAction): Promise<void> {
    switch (action.type) {
      case 'select-view':
        activeView.value = action.view
        await activateDefinition(action.view)
        return
      case 'select-range':
      case 'select-reference-index':
        await definitionFor(action.view).dispatch(action)
        return
      case 'activate-panel':
        await activateDefinition(action.panelId)
        return
      case 'retry-panel':
        await definitionFor(action.panelId).retry()
        return
    }
  }

  async function refresh(): Promise<void> {
    if (!toValue(isSectionActive)) return
    await Promise.all([
      definitionFor(activeView.value).refresh(),
      definitionFor('distribution').refresh(),
    ])
  }

  function definitionFor<TId extends FundPerformancePanelId>(id: TId) {
    return resolveFundPerformancePanelDefinition(definitions, id)
  }

  async function activateDefinition(id: FundPerformancePanelId): Promise<void> {
    const definition = definitionFor(id)
    const code = currentFundCode.value
    const info = basicInfo.value
    if (definition.updateBasicInfo && code && info) await definition.updateBasicInfo(code, info)
    else await definition.activate()
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
