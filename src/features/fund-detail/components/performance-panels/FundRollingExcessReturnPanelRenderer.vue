<script setup lang="ts">
import { fundRollingExcessRangeOptions } from '../../config/fundRollingExcessRangeOptions'
import type {
  FundPerformancePanelRendererActionFor,
  FundRollingExcessReturnPanelModel,
} from '../../models/fundPerformancePanel'
import FundRollingExcessReturnChart from '../FundRollingExcessReturnChart.vue'

defineProps<{ panel: FundRollingExcessReturnPanelModel; visible: boolean }>()
const emit = defineEmits<{
  action: [action: FundPerformancePanelRendererActionFor<'rolling-excess-return'>]
}>()

function selectRange(value: string): void {
  const option = fundRollingExcessRangeOptions.find(
    ({ value: optionValue }) => optionValue === value,
  )
  if (option) {
    emit('action', { range: option.value, type: 'select-range', view: 'rolling-excess-return' })
  }
}
</script>

<template>
  <div class="pt-4">
    <div class="performance-filters">
      <t-select
        label="日期范围："
        :options="fundRollingExcessRangeOptions"
        :value="panel.selectedRange"
        @update:value="selectRange(String($event))"
      />
    </div>
    <FundRollingExcessReturnChart
      :error="panel.error"
      :is-loading="panel.isLoading"
      :model="panel.chart"
      :visible="visible"
      :warning="panel.warning"
      @retry="emit('action', { panelId: 'rolling-excess-return', type: 'retry-panel' })"
    />
  </div>
</template>
