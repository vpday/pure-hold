<script setup lang="ts">
import { fundDrawdownRangeOptions } from '../config/fundDrawdownRangeOptions'
import { fundHistoryRangeOptions } from '../config/fundHistoryRangeOptions'
import { fundRollingExcessRangeOptions } from '../config/fundRollingExcessRangeOptions'
import type {
  FundPerformanceAction,
  FundPerformancePanelId,
  FundPerformancePanelModel,
} from '../models/fundPerformancePanel'
import FundCumulativeExcessReturnChart from './FundCumulativeExcessReturnChart.vue'
import FundCumulativeReturnsChart from './FundCumulativeReturnsChart.vue'
import FundDistributionPanel from './FundDistributionPanel.vue'
import FundDrawdownComparisonChart from './FundDrawdownComparisonChart.vue'
import FundNetValueChart from './FundNetValueChart.vue'
import FundRollingExcessReturnChart from './FundRollingExcessReturnChart.vue'

defineProps<{
  panel: FundPerformancePanelModel
  visible: boolean
}>()
const emit = defineEmits<{ action: [action: FundPerformanceAction] }>()

function selectCumulativeReturnsRange(value: string): void {
  const option = fundHistoryRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (option)
    emit('action', { range: option.value, type: 'select-range', view: 'cumulative-returns' })
}

function selectCumulativeExcessReturnRange(value: string): void {
  const option = fundHistoryRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (option) {
    emit('action', {
      range: option.value,
      type: 'select-range',
      view: 'cumulative-excess-return',
    })
  }
}

function selectDrawdownRange(value: string): void {
  const option = fundDrawdownRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (option) {
    emit('action', { range: option.value, type: 'select-range', view: 'drawdown-comparison' })
  }
}

function selectNetValueRange(value: string): void {
  const option = fundHistoryRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (option) emit('action', { range: option.value, type: 'select-range', view: 'net-value' })
}

function selectReinvestedNetValueRange(value: string): void {
  const option = fundHistoryRangeOptions.find(({ value: optionValue }) => optionValue === value)
  if (option) {
    emit('action', { range: option.value, type: 'select-range', view: 'reinvested-net-value' })
  }
}

function selectRollingExcessRange(value: string): void {
  const option = fundRollingExcessRangeOptions.find(
    ({ value: optionValue }) => optionValue === value,
  )
  if (option) {
    emit('action', { range: option.value, type: 'select-range', view: 'rolling-excess-return' })
  }
}

function selectReferenceIndex(value: string): void {
  emit('action', { code: value, type: 'select-reference-index' })
}

function retry(panelId: FundPerformancePanelId): void {
  emit('action', { panelId, type: 'retry-panel' })
}
</script>

<template>
  <template v-if="panel.id === 'cumulative-returns'">
    <div class="pt-4">
      <div class="performance-filters">
        <t-select
          label="日期范围："
          :options="fundHistoryRangeOptions"
          :value="panel.selectedRange"
          @update:value="selectCumulativeReturnsRange(String($event))"
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
        @retry="retry('cumulative-returns')"
      />
    </div>
  </template>
  <template v-else-if="panel.id === 'cumulative-excess-return'">
    <div class="pt-4">
      <div class="performance-filters">
        <t-select
          label="日期范围："
          :options="fundHistoryRangeOptions"
          :value="panel.selectedRange"
          @update:value="selectCumulativeExcessReturnRange(String($event))"
        />
      </div>
      <FundCumulativeExcessReturnChart
        :error="panel.error"
        :is-loading="panel.isLoading"
        :model="panel.chart"
        :visible="visible"
        :warning="panel.warning"
        @retry="retry('cumulative-excess-return')"
      />
    </div>
  </template>
  <template v-else-if="panel.id === 'rolling-excess-return'">
    <div class="pt-4">
      <div class="performance-filters">
        <t-select
          label="日期范围："
          :options="fundRollingExcessRangeOptions"
          :value="panel.selectedRange"
          @update:value="selectRollingExcessRange(String($event))"
        />
      </div>
      <FundRollingExcessReturnChart
        :error="panel.error"
        :is-loading="panel.isLoading"
        :model="panel.chart"
        :visible="visible"
        :warning="panel.warning"
        @retry="retry('rolling-excess-return')"
      />
    </div>
  </template>
  <template v-else-if="panel.id === 'drawdown-comparison'">
    <div class="pt-4">
      <div class="performance-filters">
        <t-select
          label="日期范围："
          :options="fundDrawdownRangeOptions"
          :value="panel.selectedRange"
          @update:value="selectDrawdownRange(String($event))"
        />
      </div>
      <FundDrawdownComparisonChart
        :error="panel.error"
        :is-loading="panel.isLoading"
        :model="panel.chart"
        :visible="visible"
        :warning="panel.warning"
        @retry="retry('drawdown-comparison')"
      />
    </div>
  </template>
  <template v-else-if="panel.id === 'net-value'">
    <div class="pt-4">
      <div class="performance-filters">
        <t-select
          label="日期范围："
          :options="fundHistoryRangeOptions"
          :value="panel.selectedRange"
          @update:value="selectNetValueRange(String($event))"
        />
      </div>
      <FundNetValueChart
        :error="panel.error"
        :is-loading="panel.isLoading"
        :model="panel.chart"
        :visible="visible"
        @retry="retry('net-value')"
      />
    </div>
  </template>
  <template v-else-if="panel.id === 'reinvested-net-value'">
    <div class="pt-4">
      <div class="performance-filters">
        <t-select
          label="日期范围："
          :options="fundHistoryRangeOptions"
          :value="panel.selectedRange"
          @update:value="selectReinvestedNetValueRange(String($event))"
        />
      </div>
      <t-alert
        v-if="panel.warning"
        class="mb-4"
        close-btn
        theme="warning"
        :message="panel.warning"
      />
      <FundNetValueChart
        :error="panel.error"
        :is-loading="panel.isLoading"
        :model="panel.chart"
        :visible="visible"
        @retry="retry('reinvested-net-value')"
      />
    </div>
  </template>
  <FundDistributionPanel v-else :model="panel" @retry="retry('distribution')" />
</template>

<style scoped>
@reference '@/style.css';

.performance-filters {
  @apply mb-4 flex w-full sm:w-55 flex-col gap-2 sm:flex-row;
}
</style>
