<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import type { FundAddition } from '@/domains/funds/models/fundAddition'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import FundSearchActions from './components/FundSearchActions.vue'
import FundSearchContent from './components/FundSearchContent.vue'
import FundSearchDesktopDialog from './components/FundSearchDesktopDialog.vue'
import FundSearchMobileDrawer from './components/FundSearchMobileDrawer.vue'
import { useFundSearch } from './composables/useFundSearch'
import {
  createFundHoldingDrafts,
  type FundHoldingDraft,
  type FundHoldingDraftErrors,
  validateFundHoldingDrafts,
} from './models/fundHoldingDraft'

const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const visible = ref(false)
const existingCodes = new Set<string>()
const search = useFundSearch(existingCodes)
const step = ref<'holdings' | 'search'>('search')
const holdingDrafts = ref<FundHoldingDraft[]>([])
const holdingErrors = ref<Readonly<Record<string, FundHoldingDraftErrors>>>({})
const submitError = ref('')

function open(): void {
  close()
  for (const code of store.fundOrder) existingCodes.add(code)
  visible.value = true
}

function close(): void {
  visible.value = false
  existingCodes.clear()
  search.reset()
  step.value = 'search'
  holdingDrafts.value = []
  holdingErrors.value = {}
  submitError.value = ''
}

function addWithoutHoldings(): void {
  submit(
    search.selected.value.map(({ code, name }) => ({
      code,
      name,
    })),
  )
}

function enterHoldings(): void {
  holdingDrafts.value = createFundHoldingDrafts(search.selected.value).map((draft) => ({
    ...draft,
  }))
  holdingErrors.value = {}
  submitError.value = ''
  step.value = 'holdings'
}

function confirmHoldings(): void {
  const result = validateFundHoldingDrafts(holdingDrafts.value)
  holdingErrors.value = result.errors
  if (!result.additions) return
  submit(result.additions)
}

function submit(additions: readonly FundAddition[]): void {
  const result = store.addFunds(additions)
  if (result.error) {
    submitError.value = result.error
    return
  }
  MessagePlugin.success(`已添加 ${additions.length} 只基金`)
  close()
}

defineExpose({ open })
</script>

<template>
  <FundSearchDesktopDialog v-if="isSmUp" v-model:visible="visible" :step="step" @close="close">
    <FundSearchContent
      :error="search.error.value"
      :existing-codes="existingCodes"
      :has-more="search.hasMore.value"
      :holding-drafts="holdingDrafts"
      :holding-errors="holdingErrors"
      :is-loading="search.isLoading.value"
      :items="search.items.value"
      :keyword="search.keyword.value"
      :selected="search.selected.value"
      :selected-expanded="search.selectedExpanded.value"
      :step="step"
      :submit-error="submitError"
      @load-more="search.loadMore"
      @remove="search.removeSelection"
      @retry="search.retry"
      @toggle="search.toggleSelection"
      @toggle-selected="search.selectedExpanded.value = !search.selectedExpanded.value"
      @update-keyword="search.setKeyword"
    />
    <template #footer>
      <FundSearchActions
        :disabled="search.selected.value.length === 0"
        :step="step"
        @add="addWithoutHoldings"
        @back="step = 'search'"
        @confirm-holdings="confirmHoldings"
        @enter-holdings="enterHoldings"
      />
    </template>
  </FundSearchDesktopDialog>

  <FundSearchMobileDrawer v-else v-model:visible="visible" :step="step" @close="close">
    <FundSearchContent
      :error="search.error.value"
      :existing-codes="existingCodes"
      :has-more="search.hasMore.value"
      :holding-drafts="holdingDrafts"
      :holding-errors="holdingErrors"
      :is-loading="search.isLoading.value"
      :items="search.items.value"
      :keyword="search.keyword.value"
      :selected="search.selected.value"
      :selected-expanded="search.selectedExpanded.value"
      :step="step"
      :submit-error="submitError"
      @load-more="search.loadMore"
      @remove="search.removeSelection"
      @retry="search.retry"
      @toggle="search.toggleSelection"
      @toggle-selected="search.selectedExpanded.value = !search.selectedExpanded.value"
      @update-keyword="search.setKeyword"
    />
    <template #footer>
      <FundSearchActions
        :disabled="search.selected.value.length === 0"
        :step="step"
        @add="addWithoutHoldings"
        @back="step = 'search'"
        @confirm-holdings="confirmHoldings"
        @enter-holdings="enterHoldings"
      />
    </template>
  </FundSearchMobileDrawer>
</template>
