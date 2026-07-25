<script setup lang="ts">
import type { IndexQuoteGroupViewModel, StatusTone } from '../models/indexOverviewViewModel'
import IndexQuoteCard from './IndexQuoteCard.vue'

defineProps<{
  groups: readonly IndexQuoteGroupViewModel[]
  statusText: string
  statusTone: StatusTone
}>()
</script>

<template>
  <div>
    <div class="flex flex-col gap-4">
      <section v-for="group in groups" :key="group.id">
        <h3 class="mb-2 text-sm font-medium">{{ group.name }}</h3>
        <div v-if="group.items.length > 0" class="flex flex-wrap gap-2 sm:gap-3">
          <IndexQuoteCard v-for="item in group.items" :key="item.id" :item="item" />
        </div>
        <p v-else class="text-sm text-(--td-text-color-secondary)">暂无已选指数</p>
      </section>
    </div>
    <div
      class="mt-4 text-left text-xs"
      :class="{
        'text-(--td-text-color-secondary)': statusTone === 'neutral',
        'text-(--td-error-color)': statusTone === 'error',
        'text-(--td-warning-color)': statusTone === 'warning',
      }"
    >
      {{ statusText }}
    </div>
  </div>
</template>
