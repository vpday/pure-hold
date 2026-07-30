<script setup lang="ts">
import type { FundSearchItem } from '@/domains/funds/models/fundSearch'
import type { FundAdditionContentModel } from '../models/fundAdditionSessionModel'
import FundHoldingForm from './FundHoldingForm.vue'
import FundSearchResults from './FundSearchResults.vue'
import SelectedFundsPanel from './SelectedFundsPanel.vue'

defineProps<{ model: FundAdditionContentModel }>()

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
    <t-alert v-if="model.submitError" theme="error" :message="model.submitError" />

    <template v-if="model.step === 'search'">
      <t-input
        :value="model.search.keyword"
        clearable
        type="search"
        placeholder="输入基金代码或简称"
        @update:value="emit('updateKeyword', String($event))"
      >
        <template #prefix-icon><t-icon name="search" /></template>
      </t-input>
      <FundSearchResults
        :error="model.search.error"
        :existing-codes="model.search.existingCodes"
        :has-more="model.search.hasMore"
        :is-loading="model.search.isLoading"
        :items="model.search.items"
        :selected-codes="new Set(model.search.selected.map(({ code }) => code))"
        @load-more="emit('loadMore')"
        @retry="emit('retry')"
        @toggle="emit('toggle', $event)"
      />
      <SelectedFundsPanel
        :expanded="model.search.selectedExpanded"
        :items="model.search.selected"
        @remove="emit('remove', $event)"
        @toggle-expanded="emit('toggleSelected')"
      />
    </template>

    <template v-else>
      <FundHoldingForm :drafts="model.holdings.drafts" :errors="model.holdings.errors" />
    </template>
  </div>
</template>
