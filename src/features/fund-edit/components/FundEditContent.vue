<script setup lang="ts">
import { computed } from 'vue'

import type { FundGroupDefinition } from '@/domains/funds/models/fundGroupDefinition'
import FundHoldingEditor from '@/features/fund-holding-form/components/FundHoldingEditor.vue'
import type { FundHoldingDraftErrors } from '@/features/fund-holding-form/models/fundHoldingDraft'
import type { FundEditDraft } from '../models/fundEditDraft'

const props = defineProps<{
  draft: FundEditDraft
  errors: FundHoldingDraftErrors
  groups: readonly FundGroupDefinition[]
  submitError: string
}>()

const groupOptions = computed(() =>
  props.groups.map(({ id, name }) => ({ label: name, value: id })),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <t-alert v-if="submitError" theme="error" :message="submitError" />
    <header class="flex flex-wrap items-center gap-2">
      <h3 class="min-w-0 flex-1 font-medium">{{ draft.name }}</h3>
      <span
        class="rounded bg-(--td-bg-color-secondarycontainer) px-2 py-0.5 font-mono text-xs tabular-nums text-(--td-text-color-secondary)"
      >
        {{ draft.code }}
      </span>
    </header>
    <div class="border-t border-(--td-component-stroke)" />
    <FundHoldingEditor
      v-model:selected-group-ids="draft.selectedGroupIds"
      :draft="draft.holding"
      :errors="errors"
      :group-options="groupOptions"
    />
  </div>
</template>
