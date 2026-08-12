<script setup lang="ts">
import { computed } from 'vue'

import type {
  FundPerformanceAction,
  FundPerformancePanelModel,
} from '../models/fundPerformancePanel'
import { resolveFundPerformancePanelRenderer } from './performance-panels/fundPerformancePanelRendererRegistry'

const props = defineProps<{
  panel: FundPerformancePanelModel
  visible: boolean
}>()
const emit = defineEmits<{ action: [action: FundPerformanceAction] }>()
const renderer = computed(() => resolveFundPerformancePanelRenderer(props.panel.id))
</script>

<template>
  <component :is="renderer" :panel="panel" :visible="visible" @action="emit('action', $event)" />
</template>

<style scoped>
@reference '@/style.css';

:deep(.performance-filters) {
  @apply mb-4 flex w-full flex-col gap-2 sm:w-55 sm:flex-row;
}
</style>
