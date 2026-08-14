<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

import type { IndexDefinition } from '@/domains/indices/models/indexDefinition'
import type { DraftGroup } from '../models/settingsTypes'
import IndexSearchPanel from './IndexSearchPanel.vue'

const props = defineProps<{
  definitions: readonly IndexDefinition[]
  group: DraftGroup
}>()

const emit = defineEmits<{
  addIndex: [quoteCode: string]
  removeIndex: [quoteCode: string]
  reorderIndices: [fromIndex: number, toIndex: number]
}>()

const draggableQuoteCodes = ref<string[]>([])
const definitionsByQuoteCode = computed(
  () => new Map(props.definitions.map((definition) => [definition.quoteCode, definition])),
)

watch(
  () => props.group,
  (group) => {
    draggableQuoteCodes.value = [...group.quoteCodes]
  },
  { deep: true, immediate: true },
)

function getDefinition(quoteCode: string): IndexDefinition | undefined {
  return definitionsByQuoteCode.value.get(quoteCode)
}

function formatDescription(quoteCode: string): string {
  const definition = getDefinition(quoteCode)
  if (!definition) {
    return quoteCode
  }

  return [definition.securityCode, definition.typeName, definition.sectorNames?.join(',')]
    .filter((value): value is string => Boolean(value))
    .join(' · ')
}

function handleDragEnd(event: { newIndex?: number; oldIndex?: number }): void {
  if (event.oldIndex !== undefined && event.newIndex !== undefined) {
    emit('reorderIndices', event.oldIndex, event.newIndex)
  }
}
</script>

<template>
  <section aria-label="指数配置" class="index-group-detail">
    <IndexSearchPanel
      :definitions="definitions"
      :selected-quote-codes="group.quoteCodes"
      @add="emit('addIndex', $event)"
    />

    <div class="flex items-center justify-between gap-3">
      <span class="text-sm font-medium"
        >{{ group.name }} 已选指数（{{ group.quoteCodes.length }}）</span
      >
      <span class="text-xs text-(--td-text-color-placeholder)">拖拽以排序</span>
    </div>

    <VueDraggable
      v-model="draggableQuoteCodes"
      :animation="150"
      :delay="200"
      :delay-on-touch-only="true"
      data-testid="index-settings-selected-list"
      handle=".drag-handle"
      class="selected-index-list overflow-y-auto"
      @end="handleDragEnd"
    >
      <t-card
        v-for="quoteCode in draggableQuoteCodes"
        :key="quoteCode"
        :bordered="true"
        class="shrink-0"
        size="small"
      >
        <div class="flex items-center gap-3">
          <t-icon name="move" class="drag-handle cursor-grab text-(--td-text-color-placeholder)" />
          <div class="min-w-0 flex-1">
            <p class="truncate">{{ getDefinition(quoteCode)?.name ?? quoteCode }}</p>
            <p class="truncate text-sm text-(--td-text-color-secondary)">
              {{ formatDescription(quoteCode) }}
            </p>
          </div>
          <t-button
            :title="`移除${getDefinition(quoteCode)?.name ?? quoteCode}`"
            :aria-label="`移除${getDefinition(quoteCode)?.name ?? quoteCode}`"
            size="small"
            variant="text"
            shape="square"
            @click="emit('removeIndex', quoteCode)"
          >
            <template #icon><t-icon name="delete" /></template>
          </t-button>
        </div>
      </t-card>
    </VueDraggable>

    <t-empty
      v-if="group.quoteCodes.length === 0"
      class="py-8"
      description="暂无指数，请通过上方搜索添加"
      size="small"
    />
  </section>
</template>

<style scoped>
@reference '@/style.css';

.index-group-detail {
  @apply flex h-full min-h-0 flex-col gap-4 overflow-hidden;
}

.selected-index-list {
  @apply flex min-h-0 flex-1 flex-col gap-2 pr-1;
}
</style>
