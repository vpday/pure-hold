import { computed, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'

import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import { fundHistoryRangeOptions } from '../config/fundHistoryRangeOptions'
import type { LoadFundCumulativeReturns } from '../models/fundCumulativeReturnsChart'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
import type { FundPerformanceView } from '../models/fundPerformanceView'
import type { LoadFundNetValueHistory } from '../models/fundNetValueChart'
import { toFundCumulativeReturnsChartModel } from '../presenters/toFundCumulativeReturnsChartModel'
import { toFundNetValueChartModel } from '../presenters/toFundNetValueChartModel'
import { useFundCumulativeReturns } from './useFundCumulativeReturns'
import { useFundNetValueHistory } from './useFundNetValueHistory'

interface UseFundPerformanceOptions {
  readonly loadCumulativeReturns?: LoadFundCumulativeReturns
  readonly loadNetValueHistory?: LoadFundNetValueHistory
}

export function useFundPerformance(
  isVisible: MaybeRefOrGetter<boolean>,
  options: UseFundPerformanceOptions = {},
) {
  const cumulativeReturns = useFundCumulativeReturns(options.loadCumulativeReturns)
  const netValueHistory = useFundNetValueHistory(options.loadNetValueHistory)
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
  const cumulativeReturnsChart = computed(() => {
    const returns = cumulativeReturns.data.value
    const referenceIndex = selectedReferenceIndex.value
    const rangeOption = selectedRangeOption.value
    return returns && referenceIndex && rangeOption
      ? toFundCumulativeReturnsChartModel(returns, referenceIndex.name, rangeOption.label)
      : undefined
  })
  const unitNetValueChart = computed(() => {
    const history = netValueHistory.data['unit-net-value'].value
    return history ? toFundNetValueChartModel(history, 'unit-net-value') : undefined
  })
  const cumulativeNetValueChart = computed(() => {
    const history = netValueHistory.data['cumulative-net-value'].value
    return history ? toFundNetValueChartModel(history, 'cumulative-net-value') : undefined
  })
  const model = computed<FundPerformanceSectionModel>(() => ({
    activeView: activeView.value,
    cumulativeNetValue: {
      chart: cumulativeNetValueChart.value,
      error: netValueHistory.error['cumulative-net-value'].value,
      isLoading: netValueHistory.isLoading['cumulative-net-value'].value,
      selectedRange: netValueHistory.selectedRanges['cumulative-net-value'].value,
    },
    cumulativeReturns: {
      chart: cumulativeReturnsChart.value,
      error: cumulativeReturns.error.value,
      isLoading: cumulativeReturns.isLoading.value,
      referenceIndexOptions: cumulativeReturns.referenceIndexOptions.value,
      selectedRange: cumulativeReturns.selectedRange.value,
      selectedReferenceIndexCode: cumulativeReturns.selectedReferenceIndexCode.value,
    },
    isVisible: toValue(isVisible),
    unitNetValue: {
      chart: unitNetValueChart.value,
      error: netValueHistory.error['unit-net-value'].value,
      isLoading: netValueHistory.isLoading['unit-net-value'].value,
      selectedRange: netValueHistory.selectedRanges['unit-net-value'].value,
    },
  }))

  function open(code: string): void {
    currentFundCode.value = code
    basicInfo.value = undefined
    activeView.value = 'cumulative-returns'
    cumulativeReturns.close()
    netValueHistory.close()
    netValueHistory.initialize(code)
  }

  function close(): void {
    currentFundCode.value = undefined
    basicInfo.value = undefined
    cumulativeReturns.close()
    netValueHistory.close()
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
    await netValueHistory.activate(view)
  }

  async function selectRange(view: FundPerformanceView, range: FundHistoryRange): Promise<void> {
    await (view === 'cumulative-returns'
      ? cumulativeReturns.selectRange(range)
      : netValueHistory.selectRange(view, range))
  }

  async function selectReferenceIndex(code: string): Promise<void> {
    await cumulativeReturns.selectReferenceIndex(code)
  }

  async function retry(view: FundPerformanceView): Promise<void> {
    await (view === 'cumulative-returns' ? cumulativeReturns.retry() : netValueHistory.retry(view))
  }

  async function refresh(): Promise<void> {
    if (!toValue(isVisible)) return
    const view = activeView.value
    await (view === 'cumulative-returns'
      ? cumulativeReturns.refresh()
      : netValueHistory.refresh(view))
  }

  return {
    close,
    model,
    open,
    refresh,
    retry,
    selectRange,
    selectReferenceIndex,
    selectView,
    updateBasicInfo,
  }
}
