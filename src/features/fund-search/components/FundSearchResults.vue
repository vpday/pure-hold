<script setup lang="ts">
import { computed } from 'vue'
import type { ListProps } from 'tdesign-vue-next'

import type { FundSearchItem } from '@/domains/funds/models/fundSearch'

const props = defineProps<{
  error: string
  existingCodes: ReadonlySet<string>
  hasMore: boolean
  isLoading: boolean
  items: readonly FundSearchItem[]
  selectedCodes: ReadonlySet<string>
}>()

const emit = defineEmits<{
  loadMore: []
  retry: []
  toggle: [item: FundSearchItem]
}>()

const asyncLoading = computed<ListProps['asyncLoading']>(() => {
  if (props.isLoading) return 'loading'
  if (props.hasMore && !props.error) return 'load-more'
  return ''
})
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto border border-(--td-component-border) pr-1">
    <t-alert v-if="error" theme="error" class="mb-3" :message="error">
      <template #operation>
        <t-button size="small" variant="text" @click="emit('retry')">重试</t-button>
      </template>
    </t-alert>
    <t-list
      v-if="items.length > 0"
      :async-loading="asyncLoading"
      :split="true"
      size="small"
      @load-more="emit('loadMore')"
    >
      <t-list-item
        v-for="item in items"
        :key="item.code"
        class="cursor-pointer"
        @click="emit('toggle', item)"
      >
        {{ item.name }}（{{ item.code }}）
        <template #action>
          <span
            v-if="existingCodes.has(item.code)"
            class="text-sm text-(--td-text-color-placeholder)"
          >
            已添加
          </span>
          <t-checkbox
            v-else
            :checked="selectedCodes.has(item.code)"
            :aria-label="`选择${item.name}`"
            @click.stop
            @change="emit('toggle', item)"
          />
        </template>
      </t-list-item>
    </t-list>
    <div v-else-if="!isLoading && !error" class="mt-3">
      <t-empty title="输入基金代码或简称开始搜索" />
    </div>
    <div v-if="isLoading && items.length === 0" class="flex justify-center py-6">
      <t-loading text="搜索中…" />
    </div>
  </div>
</template>
