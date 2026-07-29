<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDetailDrawer from './components/FundDetailDrawer.vue'
import { useFundDetail } from './composables/useFundDetail'
import { toFundDetailViewModel } from './presenters/toFundDetailViewModel'

const emit = defineEmits<{ edit: [code: string] }>()
const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const detail = useFundDetail()
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
const drawerSize = computed(() => (isSmUp.value ? '85dvh' : '100dvh'))

let unsubscribeRefresh: (() => void) | undefined
onMounted(() => {
  unsubscribeRefresh = subscribeGlobalRefresh(detail.refresh)
})
onBeforeUnmount(() => unsubscribeRefresh?.())

function open(code: string): void {
  const currentSnapshot = store.snapshotsByCode[code]
  if (!store.fundOrder.includes(code) || !currentSnapshot) {
    detail.close()
    MessagePlugin.error('基金不存在，无法查看详情')
    return
  }
  activeTab.value = 'performance'
  void detail.open(code)
}

function close(): void {
  detail.close()
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
    :size="drawerSize"
    :view-model="viewModel"
    :visible="detail.visible.value"
    @close="close"
    @edit="edit"
    @retry="detail.retry"
    @select-tab="activeTab = $event"
  />
</template>
