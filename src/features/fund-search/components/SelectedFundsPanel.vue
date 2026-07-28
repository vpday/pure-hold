<script setup lang="ts">
import type { FundSearchItem } from '@/domains/funds/models/fundSearch'

const panelValue = 'selected-funds'

defineProps<{
  expanded: boolean
  items: readonly FundSearchItem[]
}>()

const emit = defineEmits<{
  remove: [code: string]
  toggleExpanded: []
}>()
</script>

<template>
  <t-collapse
    v-if="items.length > 0"
    class="shrink-0"
    :value="expanded ? [panelValue] : []"
    expand-icon-placement="right"
    @change="emit('toggleExpanded')"
  >
    <t-collapse-panel :value="panelValue" :header="`已选 ${items.length} 只`">
      <t-list class="max-h-40 overflow-y-auto pr-1" :split="true" size="small">
        <t-list-item v-for="item in items" :key="item.code">
          {{ item.name }}（{{ item.code }}）
          <template #action>
            <t-button
              shape="square"
              size="small"
              variant="text"
              :aria-label="`移除${item.name}`"
              @click="emit('remove', item.code)"
            >
              <template #icon><t-icon name="close" /></template>
            </t-button>
          </template>
        </t-list-item>
      </t-list>
    </t-collapse-panel>
  </t-collapse>
</template>

<style scoped>
:deep(.t-collapse-panel__wrapper .t-collapse-panel__content) {
  padding: 0;
}
</style>
