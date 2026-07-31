<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDetailDrawer from './components/FundDetailDrawer.vue'
import FundPerformanceSection from './components/FundPerformanceSection.vue'
import { useFundDetail } from './composables/useFundDetail'
import { useFundPerformance } from './composables/useFundPerformance'
import { toFundDetailViewModel } from './presenters/toFundDetailViewModel'

const emit = defineEmits<{ edit: [code: string] }>()
const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const detail = useFundDetail()
const activeSection = ref('overview')
const performance = useFundPerformance(
  () => detail.visible.value && activeSection.value === 'performance',
)
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

watch([detail.visible, detail.currentCode, detail.basicInfo], ([visible, code, basicInfo]) => {
  if (visible && code && basicInfo) {
    void performance.updateBasicInfo(code, basicInfo)
  }
})

let unsubscribeRefresh: (() => void) | undefined
onMounted(() => {
  unsubscribeRefresh = subscribeGlobalRefresh(refresh)
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
  activeSection.value = 'overview'
  performance.open(code)
  void detail.open(code)
}

function close(): void {
  detail.close()
  performance.close()
}

async function refresh(): Promise<void> {
  await Promise.all([detail.refresh(), performance.refresh()])
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
    :active-section="activeSection"
    :error="detail.error.value"
    :is-loading="detail.isLoading.value"
    :size="drawerSize"
    :view-model="viewModel"
    :visible="detail.visible.value"
    @close="close"
    @edit="edit"
    @retry="detail.retry"
    @select-section="activeSection = $event"
  >
    <template #performance>
      <FundPerformanceSection
        :key="detail.currentCode.value"
        :model="performance.model.value"
        @activate-distribution="performance.activateDistribution"
        @retry="performance.retry"
        @retry-distribution="performance.retryDistribution"
        @select-range="performance.selectRange"
        @select-reference-index="performance.selectReferenceIndex"
        @select-view="performance.selectView"
      />
    </template>
  </FundDetailDrawer>
</template>
