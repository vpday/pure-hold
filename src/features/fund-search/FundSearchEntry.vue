<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import FundSearchActions from './components/FundSearchActions.vue'
import FundSearchContent from './components/FundSearchContent.vue'
import FundSearchResponsiveShell from './components/FundSearchResponsiveShell.vue'
import { useFundAdditionSession, type EnsureFundLedger } from './composables/useFundAdditionSession'

const props = defineProps<{ ensureFundLedger?: EnsureFundLedger }>()
const store = useFundsStore()
const visible = ref(false)
const session = useFundAdditionSession(store.addFunds, props.ensureFundLedger)

function open(): void {
  close()
  session.open(store.fundOrder)
  visible.value = true
}

function close(): void {
  visible.value = false
  session.reset()
}

function addWithoutHoldings(): void {
  handleSuccess(session.addWithoutHoldings())
}

function confirmHoldings(): void {
  handleSuccess(session.confirmHoldings())
}

function retryLedger(): void {
  const retriedCount = session.retryLedger()
  if (retriedCount === undefined) return
  MessagePlugin.success(`已完成 ${retriedCount} 只基金的账本建立`)
  close()
}

function handleSuccess(addedCount: number | undefined): void {
  if (addedCount === undefined) return
  MessagePlugin.success(`已添加 ${addedCount} 只基金`)
  close()
}

defineExpose({ open })
</script>

<template>
  <FundSearchResponsiveShell
    v-model:visible="visible"
    :step="session.model.value.step"
    @close="close"
  >
    <FundSearchContent
      :model="session.model.value.content"
      @load-more="session.loadMore"
      @remove="session.removeSelection"
      @retry="session.retry"
      @toggle="session.toggleSelection"
      @toggle-selected="session.toggleSelectedPanel"
      @update-keyword="session.setKeyword"
    />
    <template #footer>
      <FundSearchActions
        :model="session.model.value.actions"
        @add="addWithoutHoldings"
        @back="session.backToSearch"
        @confirm-holdings="confirmHoldings"
        @enter-holdings="session.enterHoldings"
        @retry-ledger="retryLedger"
      />
    </template>
  </FundSearchResponsiveShell>
</template>
