<script setup lang="ts">
import { computed } from 'vue'

import { fundHistoryRangeOptions } from '../../config/fundHistoryRangeOptions'
import type {
  FundNetValuePanelModel,
  FundPerformancePanelRendererActionFor,
  FundReinvestedNetValuePanelModel,
} from '../../models/fundPerformancePanel'
import FundNetValueChart from '../FundNetValueChart.vue'

const props = defineProps<{
  panel: FundNetValuePanelModel | FundReinvestedNetValuePanelModel
  visible: boolean
}>()
const emit = defineEmits<{
  action: [action: FundPerformancePanelRendererActionFor<'net-value' | 'reinvested-net-value'>]
}>()
const warning = computed(() => ('warning' in props.panel ? props.panel.warning : ''))

function selectRange(value: string): void {
  const option = fundHistoryRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (!option) return
  if (props.panel.id === 'net-value') {
    emit('action', { range: option.value, type: 'select-range', view: 'net-value' })
  } else {
    emit('action', { range: option.value, type: 'select-range', view: 'reinvested-net-value' })
  }
}

function retry(): void {
  if (props.panel.id === 'net-value') {
    emit('action', { panelId: 'net-value', type: 'retry-panel' })
  } else {
    emit('action', { panelId: 'reinvested-net-value', type: 'retry-panel' })
  }
}
</script>

<template>
  <div class="pt-4">
    <div class="performance-filters">
      <t-select
        label="日期范围："
        :options="fundHistoryRangeOptions"
        :value="panel.selectedRange"
        @update:value="selectRange(String($event))"
      />
    </div>
    <t-alert v-if="warning" class="mb-4" close-btn theme="warning" :message="warning" />
    <FundNetValueChart
      :error="panel.error"
      :is-loading="panel.isLoading"
      :model="panel.chart"
      :visible="visible"
      @retry="retry"
    />
  </div>
</template>
