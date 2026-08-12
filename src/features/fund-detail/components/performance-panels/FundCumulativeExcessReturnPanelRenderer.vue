<script setup lang="ts">
import { fundHistoryRangeOptions } from '../../config/fundHistoryRangeOptions'
import type {
  FundCumulativeExcessReturnPanelModel,
  FundPerformancePanelRendererActionFor,
} from '../../models/fundPerformancePanel'
import FundCumulativeExcessReturnChart from '../FundCumulativeExcessReturnChart.vue'

defineProps<{ panel: FundCumulativeExcessReturnPanelModel; visible: boolean }>()
const emit = defineEmits<{
  action: [action: FundPerformancePanelRendererActionFor<'cumulative-excess-return'>]
}>()

function selectRange(value: string): void {
  const option = fundHistoryRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (option) {
    emit('action', { range: option.value, type: 'select-range', view: 'cumulative-excess-return' })
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
    <FundCumulativeExcessReturnChart
      :error="panel.error"
      :is-loading="panel.isLoading"
      :model="panel.chart"
      :visible="visible"
      :warning="panel.warning"
      @retry="emit('action', { panelId: 'cumulative-excess-return', type: 'retry-panel' })"
    />
  </div>
</template>
