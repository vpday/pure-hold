<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import type {
  FundPerformanceAction,
  FundPerformancePanelId,
  FundPerformancePanelModel,
} from '../models/fundPerformancePanel'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
import FundPerformancePanelHost from './FundPerformancePanelHost.vue'

const props = defineProps<{ model: FundPerformanceSectionModel }>()
const emit = defineEmits<{ action: [action: FundPerformanceAction] }>()

const activeTab = ref<FundPerformancePanelId>('cumulative-returns')
const sectionElement = ref<HTMLElement>()

function panelForId(id: FundPerformancePanelId): FundPerformancePanelModel {
  const panel = props.model.panels.find((item) => item.id === id)
  if (!panel) throw new Error(`Missing fund performance panel: ${id}`)
  return panel
}

function selectTab(value: string): void {
  const descriptor = props.model.descriptors.find(({ id }) => id === value)
  if (!descriptor) return
  activeTab.value = descriptor.id
  if (descriptor.kind === 'chart') {
    emit('action', { type: 'select-view', view: descriptor.id })
  }
}

let observer: IntersectionObserver | undefined
onMounted(() => {
  if (!sectionElement.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      emit('action', { panelId: 'distribution', type: 'activate-panel' })
      observer?.disconnect()
      observer = undefined
    },
    { root: null },
  )
  observer.observe(sectionElement.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div ref="sectionElement" class="performance-section">
    <h2 id="fund-detail-performance-title" class="performance-title">业绩表现</h2>
    <t-tabs class="performance-tabs" :value="activeTab" @update:value="selectTab(String($event))">
      <t-tab-panel
        v-for="panelDescriptor in model.descriptors"
        :key="panelDescriptor.id"
        :label="panelDescriptor.label"
        :value="panelDescriptor.id"
      >
        <FundPerformancePanelHost
          :panel="panelForId(panelDescriptor.id)"
          :visible="activeTab === panelDescriptor.id"
          @action="emit('action', $event)"
        />
      </t-tab-panel>
    </t-tabs>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.performance-section {
  @apply mt-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4;
}

.performance-title {
  @apply flex h-12 items-center text-lg font-medium text-(--td-text-color-primary);
}

.performance-tabs {
  display: contents;
}

.performance-tabs :deep(.t-tabs__header) {
  @apply col-start-2 row-start-1 min-w-0;
}

.performance-tabs :deep(.t-tabs__content) {
  @apply col-span-2 row-start-2 min-w-0;
}
</style>
