<script setup lang="ts">
import FundHoldingEditor from '@/features/fund-holding-form/components/FundHoldingEditor.vue'
import type { FundHoldingDraft, FundHoldingDraftErrors } from '../models/fundHoldingDraft'

defineProps<{
  drafts: FundHoldingDraft[]
  errors: Readonly<Record<string, FundHoldingDraftErrors>>
}>()
</script>

<template>
  <div class="fund-holding-list">
    <article v-for="draft in drafts" :key="draft.code" class="fund-holding-card">
      <header class="flex flex-wrap items-center gap-2 pb-3">
        <h3 class="min-w-0 flex-1 font-medium">{{ draft.name }}</h3>
        <span class="fund-code-badge">
          {{ draft.code }}
        </span>
      </header>
      <div class="mb-4 border-t border-(--td-component-stroke)" />
      <FundHoldingEditor :draft="draft.holding" :errors="errors[draft.code] ?? {}" />
    </article>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.fund-holding-list {
  @apply flex flex-1 flex-col gap-4 overflow-y-auto pr-1;
}

.fund-holding-card {
  @apply rounded-lg border border-(--td-component-border) bg-(--td-bg-color-container) p-4;
}

.fund-code-badge {
  @apply rounded bg-(--td-bg-color-secondarycontainer) px-2 py-0.5 font-mono text-xs tabular-nums text-(--td-text-color-secondary);
}
</style>
