<script setup lang="ts">
import { fundHistoryRangeOptions } from '../../config/fundHistoryRangeOptions'
import type {
  FundCumulativeReturnsPanelModel,
  FundPerformancePanelRendererActionFor,
} from '../../models/fundPerformancePanel'
import FundCumulativeReturnsChart from '../FundCumulativeReturnsChart.vue'

defineProps<{ panel: FundCumulativeReturnsPanelModel; visible: boolean }>()
const emit = defineEmits<{
  action: [action: FundPerformancePanelRendererActionFor<'cumulative-returns'>]
}>()

function selectRange(value: string): void {
  const option = fundHistoryRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (option)
    emit('action', { range: option.value, type: 'select-range', view: 'cumulative-returns' })
}

function selectReferenceIndex(value: string): void {
  emit('action', { code: value, type: 'select-reference-index', view: 'cumulative-returns' })
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
      <t-select
        label="参考指数："
        :options="
          panel.referenceIndexOptions.map(({ code, name }) => ({ label: name, value: code }))
        "
        :value="panel.selectedReferenceIndexCode"
        @update:value="selectReferenceIndex(String($event))"
      />
    </div>
    <FundCumulativeReturnsChart
      :error="panel.error"
      :is-loading="panel.isLoading"
      :model="panel.chart"
      :visible="visible"
      @retry="emit('action', { panelId: 'cumulative-returns', type: 'retry-panel' })"
    />
  </div>
</template>
