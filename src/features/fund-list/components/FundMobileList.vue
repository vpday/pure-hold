<script setup lang="ts">
import type { FundRowViewModel } from '../models/fundListViewModel'
import FundQuoteCard from './FundQuoteCard.vue'

defineProps<{ rows: readonly FundRowViewModel[] }>()
const emit = defineEmits<{
  comingSoon: []
  delete: [code: string]
  detail: [code: string]
  edit: [code: string]
}>()
</script>

<template>
  <div class="mt-3 flex flex-col gap-3">
    <FundQuoteCard
      v-for="row in rows"
      :key="row.code"
      :row="row"
      @coming-soon="emit('comingSoon')"
      @delete="emit('delete', $event)"
      @detail="emit('detail', $event)"
      @edit="emit('edit', $event)"
    />
  </div>
</template>
