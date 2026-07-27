<script setup lang="ts">
import type { FundSearchItem } from '@/domains/funds/models/fundSearch'
import type { FundHoldingDraft, FundHoldingDraftErrors } from '../models/fundHoldingDraft'
import FundHoldingForm from './FundHoldingForm.vue'
import FundSearchResults from './FundSearchResults.vue'
import SelectedFundsPanel from './SelectedFundsPanel.vue'

defineProps<{
  error: string
  existingCodes: ReadonlySet<string>
  hasMore: boolean
  holdingDrafts: FundHoldingDraft[]
  holdingErrors: Readonly<Record<string, FundHoldingDraftErrors>>
  isLoading: boolean
  items: readonly FundSearchItem[]
  keyword: string
  selected: readonly FundSearchItem[]
  selectedExpanded: boolean
  step: 'holdings' | 'search'
  submitError: string
}>()

const emit = defineEmits<{
  loadMore: []
  remove: [code: string]
  retry: []
  toggle: [item: FundSearchItem]
  toggleSelected: []
  updateKeyword: [value: string]
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <t-alert v-if="submitError" theme="error" :message="submitError" />

    <template v-if="step === 'search'">
      <t-input
        :value="keyword"
        clearable
        type="search"
        placeholder="输入基金代码或简称"
        @update:value="emit('updateKeyword', String($event))"
      >
        <template #prefix-icon><t-icon name="search" /></template>
      </t-input>
      <FundSearchResults
        :error="error"
        :existing-codes="existingCodes"
        :has-more="hasMore"
        :is-loading="isLoading"
        :items="items"
        :selected-codes="new Set(selected.map(({ code }) => code))"
        @load-more="emit('loadMore')"
        @retry="emit('retry')"
        @toggle="emit('toggle', $event)"
      />
      <SelectedFundsPanel
        :expanded="selectedExpanded"
        :items="selected"
        @remove="emit('remove', $event)"
        @toggle-expanded="emit('toggleSelected')"
      />
    </template>

    <template v-else>
      <FundHoldingForm :drafts="holdingDrafts" :errors="holdingErrors" />
    </template>
  </div>
</template>
