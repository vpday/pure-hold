<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDetailDrawer from './components/FundDetailDrawer.vue'
import { fundPerformanceRangeOptions } from './config/fundPerformanceOptions'
import { useFundDetail } from './composables/useFundDetail'
import { useFundPerformance } from './composables/useFundPerformance'
import { toFundPerformanceChartModel } from './presenters/toFundPerformanceChartModel'
import { toFundDetailViewModel } from './presenters/toFundDetailViewModel'

const emit = defineEmits<{ edit: [code: string] }>()
const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const detail = useFundDetail()
const performance = useFundPerformance()
const activeTab = ref('performance')
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
  performance.referenceIndexOptions.value.find(
    ({ code }) => code === performance.selectedReferenceIndexCode.value,
  ),
)
const selectedRangeOption = computed(() =>
  fundPerformanceRangeOptions.find(({ value }) => value === performance.selectedRange.value),
)
const performanceChart = computed(() => {
  const returns = performance.data.value
  const referenceIndex = selectedReferenceIndex.value
  const rangeOption = selectedRangeOption.value
  return returns && referenceIndex && rangeOption
    ? toFundPerformanceChartModel(returns, referenceIndex.name, rangeOption.label)
    : undefined
})

watch([detail.visible, detail.currentCode, detail.basicInfo], ([visible, code, basicInfo]) => {
  if (visible && code && basicInfo) void performance.initialize(code, basicInfo)
})

let unsubscribeRefresh: (() => void) | undefined
onMounted(() => {
  unsubscribeRefresh = subscribeGlobalRefresh(() =>
    Promise.all([detail.refresh(), performance.refresh()]).then(() => undefined),
  )
})
onBeforeUnmount(() => {
  unsubscribeRefresh?.()
  performance.close()
})

function open(code: string): void {
  const currentSnapshot = store.snapshotsByCode[code]
  if (!store.fundOrder.includes(code) || !currentSnapshot) {
    detail.close()
    MessagePlugin.error('基金不存在，无法查看详情')
    return
  }
  activeTab.value = 'performance'
  performance.close()
  void detail.open(code)
}

function close(): void {
  detail.close()
  performance.close()
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
    :active-tab="activeTab"
    :error="detail.error.value"
    :is-loading="detail.isLoading.value"
    :performance-chart="performanceChart"
    :performance-error="performance.error.value"
    :performance-is-loading="performance.isLoading.value"
    :performance-range-options="fundPerformanceRangeOptions"
    :reference-index-options="performance.referenceIndexOptions.value"
    :selected-performance-range="performance.selectedRange.value"
    :selected-reference-index-code="performance.selectedReferenceIndexCode.value"
    :size="drawerSize"
    :view-model="viewModel"
    :visible="detail.visible.value"
    @close="close"
    @edit="edit"
    @retry-performance="performance.retry"
    @retry="detail.retry"
    @select-performance-range="performance.selectRange"
    @select-reference-index="performance.selectReferenceIndex"
    @select-tab="activeTab = $event"
  />
</template>
