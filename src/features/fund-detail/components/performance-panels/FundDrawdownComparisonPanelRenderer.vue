<script setup lang="ts">
import { fundDrawdownRangeOptions } from '../../config/fundDrawdownRangeOptions'
import type {
  FundDrawdownComparisonPanelModel,
  FundPerformancePanelRendererActionFor,
} from '../../models/fundPerformancePanel'
import FundDrawdownComparisonChart from '../FundDrawdownComparisonChart.vue'

defineProps<{ panel: FundDrawdownComparisonPanelModel; visible: boolean }>()
const emit = defineEmits<{
  action: [action: FundPerformancePanelRendererActionFor<'drawdown-comparison'>]
}>()

function selectRange(value: string): void {
  const option = fundDrawdownRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (option) {
    emit('action', { range: option.value, type: 'select-range', view: 'drawdown-comparison' })
  }
}
</script>

<template>
  <div class="pt-4">
    <div class="performance-filters">
      <t-select
        label="日期范围："
        :options="fundDrawdownRangeOptions"
        :value="panel.selectedRange"
        @update:value="selectRange(String($event))"
      />
    </div>
    <FundDrawdownComparisonChart
      :error="panel.error"
      :is-loading="panel.isLoading"
      :model="panel.chart"
      :visible="visible"
      :warning="panel.warning"
      @retry="emit('action', { panelId: 'drawdown-comparison', type: 'retry-panel' })"
    />
  </div>
</template>
