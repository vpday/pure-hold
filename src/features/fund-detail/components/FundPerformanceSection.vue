<script setup lang="ts">
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { TableProps } from 'tdesign-vue-next'

import { fundHistoryRangeOptions } from '../config/fundHistoryRangeOptions'
import type {
  FundConversionTableRow,
  FundDividendTableRow,
} from '../models/fundDistributionTableModel'
import type { FundPerformanceSectionModel } from '../models/fundPerformanceSectionModel'
import type { FundPerformanceView } from '../models/fundPerformanceView'
import FundCumulativeReturnsChart from './FundCumulativeReturnsChart.vue'
import FundNetValueChart from './FundNetValueChart.vue'

const props = defineProps<{ model: FundPerformanceSectionModel }>()
const emit = defineEmits<{
  activateDistribution: []
  retry: [view: FundPerformanceView]
  retryDistribution: []
  selectRange: [view: FundPerformanceView, range: FundHistoryRange]
  selectReferenceIndex: [code: string]
  selectView: [view: FundPerformanceView]
}>()

const performanceTabs = [
  { label: '累计收益', value: 'cumulative-returns' },
  { label: '净值走势', value: 'net-value' },
  { label: '复权净值', value: 'reinvested-net-value' },
] as const
const activeTab = ref<FundPerformanceView | 'distribution'>(props.model.activeView)
const sectionElement = ref<HTMLElement>()
const dividendColumns: TableProps<FundDividendTableRow>['columns'] = [
  { colKey: 'equityRecordDate', title: '权益登记日' },
  { colKey: 'exDividendDate', title: '除息日' },
  {
    cell: 'dividend-per-ten-units',
    colKey: 'dividendPerTenUnits',
    title: '每10份分红',
  },
  { colKey: 'paymentDate', title: '分红发放日' },
]
const conversionColumns: TableProps<FundConversionTableRow>['columns'] = [
  { colKey: 'conversionDate', title: '拆分折算日' },
  { colKey: 'conversionType', title: '拆分类型' },
  { cell: 'ratio', colKey: 'ratio', title: '拆分折算比例' },
]

const referenceSelectOptions = computed(() =>
  props.model.cumulativeReturns.referenceIndexOptions.map(({ code, name }) => ({
    label: name,
    value: code,
  })),
)

function selectTab(value: string): void {
  activeTab.value = value as FundPerformanceView | 'distribution'
  if (activeTab.value !== 'distribution') emit('selectView', activeTab.value)
}

let observer: IntersectionObserver | undefined
onMounted(() => {
  if (!sectionElement.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      emit('activateDistribution')
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
            :visible="model.isVisible && activeTab === 'cumulative-returns'"
            @retry="emit('retry', 'cumulative-returns')"
          />
        </div>
        <div v-else-if="performanceTab.value === 'net-value'" class="pt-4">
          <div class="performance-filters">
            <t-select
              label="日期范围："
              :options="fundHistoryRangeOptions"
              :value="model.netValue.selectedRange"
              @update:value="emit('selectRange', 'net-value', String($event) as FundHistoryRange)"
            />
          </div>
          <FundNetValueChart
            :error="model.netValue.error"
            :is-loading="model.netValue.isLoading"
            :model="model.netValue.chart"
            :visible="model.isVisible && activeTab === 'net-value'"
            @retry="emit('retry', 'net-value')"
          />
        </div>
        <div v-else class="pt-4">
          <div class="performance-filters">
            <t-select
              label="日期范围："
              :options="fundHistoryRangeOptions"
              :value="model.reinvestedNetValue.selectedRange"
              @update:value="
                emit('selectRange', 'reinvested-net-value', String($event) as FundHistoryRange)
              "
            />
          </div>
          <t-alert
            v-if="model.reinvestedNetValue.warning"
            class="mb-4"
            close-btn
            theme="warning"
            :message="model.reinvestedNetValue.warning"
          />
          <FundNetValueChart
            :error="model.reinvestedNetValue.error"
            :is-loading="model.reinvestedNetValue.isLoading"
            :model="model.reinvestedNetValue.chart"
            :visible="model.isVisible && activeTab === 'reinvested-net-value'"
            @retry="emit('retry', 'reinvested-net-value')"
          />
        </div>
      </t-tab-panel>
      <t-tab-panel label="分红送配" value="distribution">
        <div class="pt-4">
          <t-alert
            v-if="model.distribution.error"
            class="mb-4"
            theme="error"
            :message="model.distribution.error"
          >
            <template #operation>
              <t-button
                size="small"
                theme="danger"
                variant="text"
                @click="emit('retryDistribution')"
              >
                重试
              </t-button>
            </template>
          </t-alert>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section class="min-w-0">
              <h3 class="mb-3 text-base font-medium">分红送配详情</h3>
              <div class="overflow-x-auto">
                <t-table
                  class="min-w-100"
                  bordered
                  :columns="dividendColumns"
                  :data="model.distribution.dividends"
                  :empty="model.distribution.hasLoaded ? '暂无分红送配记录' : ''"
                  :loading="model.distribution.isLoading"
                  row-key="rowKey"
                  size="small"
                  table-layout="auto"
                >
                  <template #dividend-per-ten-units="{ row }">
                    <span class="font-mono tabular-nums">{{ row.dividendPerTenUnits }}</span>
                  </template>
                </t-table>
              </div>
            </section>
            <section class="min-w-0">
              <h3 class="mb-3 text-base font-medium">拆分详情</h3>
              <div class="overflow-x-auto">
                <t-table
                  bordered
                  :columns="conversionColumns"
                  :data="model.distribution.conversions"
                  :empty="model.distribution.hasLoaded ? '暂无份额折算记录' : ''"
                  :loading="model.distribution.isLoading"
                  row-key="rowKey"
                  size="small"
                  table-layout="auto"
                >
                  <template #ratio="{ row }">
                    <span class="font-mono tabular-nums">{{ row.ratio }}</span>
                  </template>
                </t-table>
              </div>
            </section>
          </div>
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
