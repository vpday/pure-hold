<script setup lang="ts">
import { computed } from 'vue'

import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import { useQuoteCarousel } from '../composables/useQuoteCarousel'
import type { IndexQuoteViewModel } from '../models/indexOverviewViewModel'

const props = defineProps<{
  items: readonly IndexQuoteViewModel[]
}>()

const { currentBreakpoint } = useBreakpoints()
const capacity = computed(() => {
  const capacities = { base: 1, sm: 2, md: 4, lg: 7, xl: 8 }
  return capacities[currentBreakpoint.value]
})
const items = computed(() => props.items)
const { handleTransitionEnd, pause, renderedPages, resume, transform, transitionEnabled } =
  useQuoteCarousel(items, capacity)

function trendClass(item: IndexQuoteViewModel) {
  return {
    'text-[var(--td-text-color-secondary)]': item.trend === 'flat' || item.trend === 'unknown',
    'text-[var(--td-success-color)]': item.trend === 'down',
    'text-[var(--td-error-color)]': item.trend === 'up',
  }
}
</script>

<template>
  <div class="h-10 overflow-hidden" @mouseenter="pause" @mouseleave="resume">
    <div
      class="h-full"
      :class="transitionEnabled ? 'transition-transform duration-300 ease-out' : ''"
      :style="{
        height: `${Math.max(1, renderedPages.length) * 100}%`,
        transform,
      }"
      @transitionend.self="handleTransitionEnd"
    >
      <div
        v-for="(page, pageIndex) in renderedPages"
        :key="pageIndex"
        class="font-normal grid items-center gap-4"
        :class="{
          'grid-cols-1': capacity === 1,
          'grid-cols-2': capacity === 2,
          'grid-cols-3': capacity === 3,
          'grid-cols-4': capacity === 4,
          'grid-cols-5': capacity === 5,
          'grid-cols-6': capacity === 6,
          'grid-cols-7': capacity === 7,
          'grid-cols-8': capacity === 8,
        }"
        :style="{ height: `${100 / Math.max(1, renderedPages.length)}%` }"
      >
        <div v-for="item in page" :key="item.id" class="min-w-0">
          <div class="truncate text-sm" :title="item.name">{{ item.name }}</div>
          <div class="flex flex-row items-baseline space-x-2 font-mono">
            <span class="whitespace-nowrap text-base tabular-nums" :class="trendClass(item)">
              {{ item.priceText }}
            </span>
            <span class="whitespace-nowrap text-xs tabular-nums" :class="trendClass(item)">
              {{ item.changePercentText }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
