<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

import type { FundMarketData } from '@/domains/funds/models/fundMarketData'

const props = defineProps<{
  categoryName: string
  fundCodes: readonly string[]
  marketDataByCode: Readonly<Record<string, FundMarketData>>
}>()

const emit = defineEmits<{
  reorder: [fromIndex: number, toIndex: number]
}>()

const draggableFundCodes = ref<string[]>([])

watch(
  () => props.fundCodes,
  (fundCodes) => {
    draggableFundCodes.value = [...fundCodes]
  },
  { deep: true, immediate: true },
)

function handleDragEnd(event: { newIndex?: number; oldIndex?: number }): void {
  if (event.oldIndex !== undefined && event.newIndex !== undefined) {
    emit('reorder', event.oldIndex, event.newIndex)
  }
}
</script>

<template>
  <section aria-label="基金排序" class="fund-order-panel">
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm font-medium">{{ categoryName }}（{{ fundCodes.length }}）</span>
      <span class="text-xs text-(--td-text-color-placeholder)">拖拽以排序</span>
    </div>

    <VueDraggable
      v-if="fundCodes.length > 0"
      v-model="draggableFundCodes"
      :animation="150"
      :delay="200"
      :delay-on-touch-only="true"
      data-testid="fund-settings-order-list"
      handle=".fund-order-drag-handle"
      class="fund-order-list overflow-y-auto"
      @end="handleDragEnd"
    >
      <t-card
        v-for="code in draggableFundCodes"
        :key="code"
        :bordered="true"
        class="shrink-0"
        size="small"
      >
        <div class="flex items-center gap-3">
          <t-icon
            name="move"
            class="fund-order-drag-handle cursor-grab text-(--td-text-color-placeholder)"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate">{{ marketDataByCode[code]?.name ?? code }}</p>
            <p class="truncate text-sm text-(--td-text-color-secondary)">{{ code }}</p>
          </div>
        </div>
      </t-card>
    </VueDraggable>

    <t-empty v-else title="暂无基金" size="medium" />
  </section>
</template>

<style scoped>
@reference '@/style.css';

.fund-order-panel {
  @apply flex h-full min-h-0 flex-col gap-3 overflow-hidden;
}

.fund-order-list {
  @apply flex min-h-0 flex-1 flex-col gap-2 pr-1;
}
</style>
