<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDetailDrawer from './components/FundDetailDrawer.vue'
import { fundHistoryRangeOptions } from './config/fundHistoryRangeOptions'
import { useFundDetail } from './composables/useFundDetail'
import { useFundCumulativeReturns } from './composables/useFundCumulativeReturns'
import { useFundNetValueHistory } from './composables/useFundNetValueHistory'
import type { FundPerformanceView } from './models/fundPerformanceView'
import type { FundNetValueView } from './models/fundNetValueChart'
import { toFundCumulativeReturnsChartModel } from './presenters/toFundCumulativeReturnsChartModel'
import { toFundDetailViewModel } from './presenters/toFundDetailViewModel'
import { toFundNetValueChartModel } from './presenters/toFundNetValueChartModel'

const emit = defineEmits<{ edit: [code: string] }>()
const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const detail = useFundDetail()
const cumulativeReturns = useFundCumulativeReturns()
const netValueHistory = useFundNetValueHistory()
const activeTab = ref('performance')
const activePerformanceView = ref<FundPerformanceView>('cumulative-returns')
const snapshot = computed(() => {
  const code = detail.currentCode.value
  return code ? store.snapshotsByCode[code] : undefined
})
const viewModel = computed(() => {
  const currentSnapshot = snapshot.value
  return currentSnapshot
    ? toFundDetailViewModel(currentSnapshot, detail.basicInfo.value)
    : undefined
})
const drawerSize = computed(() => (isSmUp.value ? '90dvh' : '100dvh'))
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

watch(
  [detail.visible, detail.currentCode, detail.basicInfo, activeTab, activePerformanceView],
  ([visible, code, basicInfo, tab, performanceView]) => {
    if (
      visible &&
      code &&
      basicInfo &&
      tab === 'performance' &&
      performanceView === 'cumulative-returns'
    ) {
      void cumulativeReturns.initialize(code, basicInfo)
    }
  },
)

let unsubscribeRefresh: (() => void) | undefined
onMounted(() => {
  unsubscribeRefresh = subscribeGlobalRefresh(refresh)
})
onBeforeUnmount(() => {
  unsubscribeRefresh?.()
  cumulativeReturns.close()
  netValueHistory.close()
})

function open(code: string): void {
  const currentSnapshot = store.snapshotsByCode[code]
  if (!store.fundOrder.includes(code) || !currentSnapshot) {
    detail.close()
    MessagePlugin.error('基金不存在，无法查看详情')
    return
  }
  activeTab.value = 'performance'
  activePerformanceView.value = 'cumulative-returns'
  cumulativeReturns.close()
  netValueHistory.close()
  netValueHistory.initialize(code)
  void detail.open(code)
}

function close(): void {
  detail.close()
  cumulativeReturns.close()
  netValueHistory.close()
}

async function selectPerformanceView(view: FundPerformanceView): Promise<void> {
  activePerformanceView.value = view
  if (view !== 'cumulative-returns') {
    await netValueHistory.activate(view)
  }
}

async function refresh(): Promise<void> {
  const requests: Promise<void>[] = [detail.refresh()]
  if (detail.visible.value && activeTab.value === 'performance') {
    const view = activePerformanceView.value
    requests.push(
      view === 'cumulative-returns' ? cumulativeReturns.refresh() : netValueHistory.refresh(view),
    )
  }
  await Promise.all(requests)
}

function selectNetValueRange(
  view: FundNetValueView,
  range: Parameters<typeof netValueHistory.selectRange>[1],
): void {
  void netValueHistory.selectRange(view, range)
}

async function edit(code: string): Promise<void> {
  close()
  await nextTick()
  emit('edit', code)
}

defineExpose({ open })
</script>

<template>
  <FundDetailDrawer
    v-if="viewModel"
    :active-performance-view="activePerformanceView"
    :active-tab="activeTab"
    :cumulative-net-value-chart="cumulativeNetValueChart"
    :cumulative-net-value-error="netValueHistory.error['cumulative-net-value'].value"
    :cumulative-net-value-is-loading="netValueHistory.isLoading['cumulative-net-value'].value"
    :error="detail.error.value"
    :is-loading="detail.isLoading.value"
    :cumulative-returns-chart="cumulativeReturnsChart"
    :cumulative-returns-error="cumulativeReturns.error.value"
    :cumulative-returns-is-loading="cumulativeReturns.isLoading.value"
    :history-range-options="fundHistoryRangeOptions"
    :reference-index-options="cumulativeReturns.referenceIndexOptions.value"
    :selected-cumulative-returns-range="cumulativeReturns.selectedRange.value"
    :selected-cumulative-net-value-range="
      netValueHistory.selectedRanges['cumulative-net-value'].value
    "
    :selected-reference-index-code="cumulativeReturns.selectedReferenceIndexCode.value"
    :selected-unit-net-value-range="netValueHistory.selectedRanges['unit-net-value'].value"
    :size="drawerSize"
    :unit-net-value-chart="unitNetValueChart"
    :unit-net-value-error="netValueHistory.error['unit-net-value'].value"
    :unit-net-value-is-loading="netValueHistory.isLoading['unit-net-value'].value"
    :view-model="viewModel"
    :visible="detail.visible.value"
    @close="close"
    @edit="edit"
    @retry-cumulative-returns="cumulativeReturns.retry"
    @retry-cumulative-net-value="netValueHistory.retry('cumulative-net-value')"
    @retry="detail.retry"
    @retry-unit-net-value="netValueHistory.retry('unit-net-value')"
    @select-cumulative-returns-range="cumulativeReturns.selectRange"
    @select-cumulative-net-value-range="selectNetValueRange('cumulative-net-value', $event)"
    @select-performance-view="selectPerformanceView"
    @select-reference-index="cumulativeReturns.selectReferenceIndex"
    @select-tab="activeTab = $event"
    @select-unit-net-value-range="selectNetValueRange('unit-net-value', $event)"
  />
</template>
