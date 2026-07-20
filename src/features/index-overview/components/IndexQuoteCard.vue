<script setup lang="ts">
import { computed } from 'vue'

import type { IndexQuoteViewModel } from '../models/indexOverviewViewModel'

const props = defineProps<{
  item: IndexQuoteViewModel
}>()

const trendClass = computed(() => ({
  'from-(--td-bg-color-secondarycontainer) text-(--td-text-color-secondary)':
    props.item.trend === 'flat' || props.item.trend === 'unknown',
  'from-(--td-success-color-light) text-(--td-success-color)': props.item.trend === 'down',
  'from-(--td-error-color-light) text-(--td-error-color)': props.item.trend === 'up',
}))
</script>

<template>
  <div
    class="rounded-md border border-gray-200 bg-linear-to-b to-(--td-bg-color-container) p-2 flex flex-col items-center w-26"
    :class="trendClass"
    :title="item.name"
  >
    <div class="max-w-full truncate text-sm">{{ item.name }}</div>
    <div class="text-base font-mono font-medium tabular-nums">
      {{ item.priceText }}
    </div>
    <div class="flex flex-row items-baseline space-x-2 font-mono text-xs">
      <span class="tabular-nums">
        {{ item.changeAmountText }}
      </span>
      <span class="tabular-nums">
        {{ item.changePercentText }}
      </span>
    </div>
  </div>
</template>
