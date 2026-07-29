<script setup lang="ts">
import type { FundDetailViewModel } from '../models/fundDetailViewModel'

defineProps<{ viewModel: FundDetailViewModel }>()
const emit = defineEmits<{ close: []; edit: [code: string] }>()
</script>

<template>
  <header class="py-4 w-full">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-xl font-semibold wrap-break-word">{{ viewModel.name }}</h2>
          <t-tag v-if="viewModel.fundType !== '--'" theme="primary" variant="light">
            {{ viewModel.fundType }}
          </t-tag>
          <t-tag variant="light" theme="danger">{{ viewModel.riskText }}</t-tag>
        </div>
        <p class="mt-1 font-mono text-sm tabular-nums text-(--td-text-color-secondary)">
          {{ viewModel.code }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <t-button variant="text" @click="emit('edit', viewModel.code)">
          <template #icon><t-icon name="edit" /></template>
          <span class="hidden sm:inline">编辑</span>
        </t-button>
        <t-button shape="square" variant="text" aria-label="关闭基金详情" @click="emit('close')">
          <template #icon><t-icon name="close" /></template>
        </t-button>
      </div>
    </div>
  </header>
</template>
