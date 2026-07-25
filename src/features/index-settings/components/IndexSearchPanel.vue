<script setup lang="ts">
import { computed, ref } from 'vue'

import type { IndexDefinition } from '@/domains/indices/models/indexDefinition'

const props = defineProps<{
  definitions: readonly IndexDefinition[]
  selectedQuoteCodes: readonly string[]
}>()

const emit = defineEmits<{
  add: [quoteCode: string]
}>()

const query = ref('')
const selectedQuoteCodes = computed(() => new Set(props.selectedQuoteCodes))
const results = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return []
  }

  return props.definitions
    .flatMap((definition) => {
      const rank = getSearchRank(definition, normalizedQuery)
      return rank === null ? [] : [{ definition, rank }]
    })
    .sort(
      (first, second) =>
        first.rank - second.rank ||
        first.definition.name.localeCompare(second.definition.name, 'zh-CN'),
    )
    .slice(0, 20)
    .map(({ definition }) => definition)
})

function addIndex(quoteCode: string): void {
  if (!selectedQuoteCodes.value.has(quoteCode)) {
    emit('add', quoteCode)
  }
}

function formatDescription(definition: IndexDefinition): string {
  return [definition.securityCode, definition.typeName, definition.sectorNames?.join(',')]
    .filter((value): value is string => Boolean(value))
    .join(' · ')
}

function getSearchRank(definition: IndexDefinition, query: string): number | null {
  const name = definition.name.toLocaleLowerCase()
  const securityCode = definition.securityCode.toLocaleLowerCase()
  const quoteCode = definition.quoteCode.toLocaleLowerCase()
  if (name.startsWith(query)) {
    return 0
  }
  if (securityCode.startsWith(query)) {
    return 1
  }
  if (quoteCode.startsWith(query)) {
    return 2
  }
  return name.includes(query) || securityCode.includes(query) || quoteCode.includes(query)
    ? 3
    : null
}
</script>

<template>
  <section aria-label="搜索指数" class="space-y-2">
    <t-input v-model:value="query" clearable placeholder="搜索指数名称或代码" type="search">
      <template #prefix-icon><t-icon name="search" /></template>
    </t-input>

    <div v-if="query.trim()" class="max-h-52 overflow-y-auto rounded-md">
      <t-list v-if="results.length > 0" size="small" :split="true">
        <t-list-item v-for="definition in results" :key="definition.quoteCode">
          <t-list-item-meta :description="formatDescription(definition)" :title="definition.name" />
          <template #action>
            <span
              v-if="selectedQuoteCodes.has(definition.quoteCode)"
              class="text-xs text-(--td-text-color-secondary)"
            >
              已添加
            </span>
            <t-button
              v-else
              :title="`添加${definition.name}`"
              :aria-label="`添加${definition.name}`"
              size="small"
              variant="text"
              @click="addIndex(definition.quoteCode)"
            >
              <template #icon><t-icon name="add" /></template>
            </t-button>
          </template>
        </t-list-item>
      </t-list>
      <t-empty v-else description="未找到匹配的指数" size="small" />
    </div>
  </section>
</template>
