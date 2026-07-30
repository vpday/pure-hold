<script setup lang="ts">
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import { computed } from 'vue'

import { fundHistoryRangeOptions } from '../config/fundHistoryRangeOptions'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
import type { FundPerformanceView } from '../models/fundPerformanceView'
import FundCumulativeReturnsChart from './FundCumulativeReturnsChart.vue'
import FundNetValueChart from './FundNetValueChart.vue'

const props = defineProps<{ model: FundPerformanceSectionModel }>()
const emit = defineEmits<{
  retry: [view: FundPerformanceView]
  selectRange: [view: FundPerformanceView, range: FundHistoryRange]
  selectReferenceIndex: [code: string]
  selectView: [view: FundPerformanceView]
}>()

const performanceTabs = [
  { label: '累计收益', value: 'cumulative-returns' },
  { label: '单位净值', value: 'unit-net-value' },
  { label: '累计净值', value: 'cumulative-net-value' },
] as const

const referenceSelectOptions = computed(() =>
  props.model.cumulativeReturns.referenceIndexOptions.map(({ code, name }) => ({
    label: name,
    value: code,
  })),
)
</script>

<template>
  <div class="mt-2 min-w-0">
    <t-tabs
      :value="model.activeView"
      @update:value="emit('selectView', String($event) as FundPerformanceView)"
    >
      <t-tab-panel
        v-for="performanceTab in performanceTabs"
        :key="performanceTab.value"
        :label="performanceTab.label"
        :value="performanceTab.value"
      >
        <div v-if="performanceTab.value === 'cumulative-returns'" class="pt-4">
          <div class="performance-filters">
            <t-select
              label="日期范围："
              :options="fundHistoryRangeOptions"
              :value="model.cumulativeReturns.selectedRange"
              @update:value="
                emit('selectRange', 'cumulative-returns', String($event) as FundHistoryRange)
              "
            />
            <t-select
              label="参考指数："
              :options="referenceSelectOptions"
              :value="model.cumulativeReturns.selectedReferenceIndexCode"
              @update:value="emit('selectReferenceIndex', String($event))"
            />
          </div>
          <FundCumulativeReturnsChart
            :error="model.cumulativeReturns.error"
            :is-loading="model.cumulativeReturns.isLoading"
            :model="model.cumulativeReturns.chart"
            :visible="model.isVisible && model.activeView === 'cumulative-returns'"
            @retry="emit('retry', 'cumulative-returns')"
          />
        </div>
        <div v-else-if="performanceTab.value === 'unit-net-value'" class="pt-4">
          <div class="performance-filters">
            <t-select
              label="日期范围："
              :options="fundHistoryRangeOptions"
              :value="model.unitNetValue.selectedRange"
              @update:value="
                emit('selectRange', 'unit-net-value', String($event) as FundHistoryRange)
              "
            />
          </div>
          <FundNetValueChart
            :error="model.unitNetValue.error"
            :is-loading="model.unitNetValue.isLoading"
            :model="model.unitNetValue.chart"
            view="unit-net-value"
            :visible="model.isVisible && model.activeView === 'unit-net-value'"
            @retry="emit('retry', 'unit-net-value')"
          />
        </div>
        <div v-else class="pt-4">
          <div class="performance-filters">
            <t-select
              label="日期范围："
              :options="fundHistoryRangeOptions"
              :value="model.cumulativeNetValue.selectedRange"
              @update:value="
                emit('selectRange', 'cumulative-net-value', String($event) as FundHistoryRange)
              "
            />
          </div>
          <FundNetValueChart
            :error="model.cumulativeNetValue.error"
            :is-loading="model.cumulativeNetValue.isLoading"
            :model="model.cumulativeNetValue.chart"
            view="cumulative-net-value"
            :visible="model.isVisible && model.activeView === 'cumulative-net-value'"
            @retry="emit('retry', 'cumulative-net-value')"
          />
        </div>
      </t-tab-panel>
    </t-tabs>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.performance-filters {
  @apply mb-4 flex w-full sm:w-55 flex-col gap-2 sm:flex-row;
}
</style>
