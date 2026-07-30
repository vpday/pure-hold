<script setup lang="ts">
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import { computed } from 'vue'

import type { FundHistoryRangeOption } from '../config/fundHistoryRangeOptions'
import type { FundCumulativeReturnsChartModel } from '../models/fundCumulativeReturnsChart'
import type { FundReferenceIndexOption } from '../models/fundCumulativeReturnsChart'
import type { FundDetailTrend, FundDetailViewModel } from '../models/fundDetailViewModel'
import type { FundNetValueChartModel } from '../models/fundNetValueChart'
import type { FundPerformanceView } from '../models/fundPerformanceView'
import FundCumulativeReturnsChart from './FundCumulativeReturnsChart.vue'
import FundDetailHeader from './FundDetailHeader.vue'
import FundNetValueChart from './FundNetValueChart.vue'
import FundTradingRules from './FundTradingRules.vue'

const props = defineProps<{
  activePerformanceView: FundPerformanceView
  activeTab: string
  cumulativeNetValueChart?: FundNetValueChartModel
  cumulativeNetValueError: string
  cumulativeNetValueIsLoading: boolean
  error: string
  isLoading: boolean
  cumulativeReturnsChart?: FundCumulativeReturnsChartModel
  cumulativeReturnsError: string
  cumulativeReturnsIsLoading: boolean
  historyRangeOptions: readonly FundHistoryRangeOption[]
  referenceIndexOptions: readonly FundReferenceIndexOption[]
  selectedCumulativeReturnsRange: FundHistoryRange
  selectedCumulativeNetValueRange: FundHistoryRange
  selectedReferenceIndexCode: string
  selectedUnitNetValueRange: FundHistoryRange
  size: string
  unitNetValueChart?: FundNetValueChartModel
  unitNetValueError: string
  unitNetValueIsLoading: boolean
  viewModel: FundDetailViewModel
  visible: boolean
}>()
const emit = defineEmits<{
  close: []
  edit: [code: string]
  retryCumulativeReturns: []
  retryCumulativeNetValue: []
  retry: []
  retryUnitNetValue: []
  selectCumulativeReturnsRange: [range: FundHistoryRange]
  selectCumulativeNetValueRange: [range: FundHistoryRange]
  selectPerformanceView: [view: FundPerformanceView]
  selectReferenceIndex: [code: string]
  selectTab: [tab: string]
  selectUnitNetValueRange: [range: FundHistoryRange]
  toggleDetails: []
}>()

const referenceSelectOptions = computed(() =>
  props.referenceIndexOptions.map(({ code, name }) => ({ label: name, value: code })),
)

const tabs = [
  { label: '业绩表现', value: 'performance' },
  { label: '数据指标', value: 'metrics' },
  { label: '持仓构成', value: 'holdings' },
  { label: '交易规则', value: 'trading-rules' },
  { label: '成交记录', value: 'transactions' },
] as const

const performanceTabs = [
  { label: '累计收益', value: 'cumulative-returns' },
  { label: '单位净值', value: 'unit-net-value' },
  { label: '累计净值', value: 'cumulative-net-value' },
] as const

function trendClass(trend: FundDetailTrend): string {
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  return 'text-(--td-text-color-primary)'
}
</script>

<template>
  <t-drawer
    attach="body"
    :close-btn="false"
    destroy-on-close
    drawer-class-name="fund-detail-drawer"
    :footer="false"
    placement="bottom"
    prevent-scroll-through
    :size="size"
    :visible="visible"
    :size-draggable="true"
    @close="emit('close')"
  >
    <template #header>
      <FundDetailHeader
        :view-model="viewModel"
        @close="emit('close')"
        @edit="emit('edit', $event)"
      />
    </template>

    <div class="h-full min-h-0 overflow-x-hidden overflow-y-auto fund-detail-scroll">
      <div class="grid grid-cols-3 lg:grid-cols-5 lg:gap-5">
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">单位净值</p>
          <p class="nav-value">
            {{ viewModel.navText }}
          </p>
          <p class="font-mono text-xs tabular-nums">
            {{ viewModel.navDateText }}
          </p>
        </div>
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">日涨跌幅</p>
          <p
            class="mt-1 font-mono text-lg font-medium tabular-nums"
            :class="trendClass(viewModel.dailyChangeTrend)"
          >
            {{ viewModel.dailyChangePercentText }}
          </p>
        </div>
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">近一年收益</p>
          <p
            class="mt-1 font-mono text-lg font-medium tabular-nums"
            :class="trendClass(viewModel.oneYearReturnTrend)"
          >
            {{ viewModel.oneYearReturnText }}
          </p>
        </div>
      </div>

      <div class="mt-4">
        <t-skeleton v-if="isLoading" animation="gradient" :row-col="[1, 1, 1]" />
        <div
          v-else-if="error"
          class="rounded-md bg-(--td-error-color-light-9) p-4 text-(--td-error-color)"
        >
          <p>{{ error }}</p>
          <t-button
            class="mt-2"
            size="small"
            theme="danger"
            variant="outline"
            @click="emit('retry')"
          >
            重试
          </t-button>
        </div>
        <dl v-else class="details-grid">
          <div>
            <dt class="text-xs text-(--td-text-color-secondary)">管理人</dt>
            <dd class="mt-1 wrap-break-word text-(--td-text-color-primary)">
              {{ viewModel.companyName }}
            </dd>
          </div>
          <div v-if="viewModel.morningstarRating !== null">
            <dt class="text-xs text-(--td-text-color-secondary)">晨星评级</dt>
            <dd class="mt-1">
              <t-rate :default-value="viewModel.morningstarRating" disabled size="16" />
            </dd>
          </div>
          <div v-if="viewModel.shanghaiRating !== null">
            <dt class="text-xs text-(--td-text-color-secondary)">上证评级</dt>
            <dd class="mt-1">
              <t-rate :default-value="viewModel.shanghaiRating" disabled size="16" />
            </dd>
          </div>
          <div>
            <dt class="text-xs text-(--td-text-color-secondary)">净资产规模</dt>
            <dd class="mt-1 text-(--td-text-color-primary)">
              {{ viewModel.netAssetsText }}
              <span
                v-if="viewModel.netAssetsDateText !== '--'"
                class="text-(--td-text-color-secondary)"
              >
                （{{ viewModel.netAssetsDateText }}）
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-(--td-text-color-secondary)">成立日期</dt>
            <dd class="mt-1 text-(--td-text-color-primary)">{{ viewModel.establishedDateText }}</dd>
          </div>
          <div v-if="viewModel.trackingIndexName && viewModel.trackingIndexName !== '--'">
            <dt class="text-xs text-(--td-text-color-secondary)">跟踪指数</dt>
            <dd class="mt-1 wrap-break-word text-(--td-text-color-primary)">
              {{ viewModel.trackingIndexName }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="mt-2 min-w-0">
        <t-tabs :value="activeTab" @update:value="emit('selectTab', String($event))">
          <t-tab-panel
            class="mt-4"
            v-for="tab in tabs"
            :key="tab.value"
            :label="tab.label"
            :value="tab.value"
          >
            <div v-if="tab.value === 'performance'" class="min-w-0">
              <t-tabs
                :value="activePerformanceView"
                @update:value="emit('selectPerformanceView', String($event) as FundPerformanceView)"
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
                        :options="historyRangeOptions"
                        :value="selectedCumulativeReturnsRange"
                        @update:value="
                          emit('selectCumulativeReturnsRange', String($event) as FundHistoryRange)
                        "
                      />
                      <t-select
                        label="参考指数："
                        :options="referenceSelectOptions"
                        :value="selectedReferenceIndexCode"
                        @update:value="emit('selectReferenceIndex', String($event))"
                      />
                    </div>
                    <FundCumulativeReturnsChart
                      :error="cumulativeReturnsError"
                      :is-loading="cumulativeReturnsIsLoading"
                      :model="cumulativeReturnsChart"
                      :visible="
                        visible &&
                        activeTab === 'performance' &&
                        activePerformanceView === 'cumulative-returns'
                      "
                      @retry="emit('retryCumulativeReturns')"
                    />
                  </div>
                  <div v-else-if="performanceTab.value === 'unit-net-value'" class="pt-4">
                    <div class="performance-filters">
                      <t-select
                        label="日期范围："
                        :options="historyRangeOptions"
                        :value="selectedUnitNetValueRange"
                        @update:value="
                          emit('selectUnitNetValueRange', String($event) as FundHistoryRange)
                        "
                      />
                    </div>
                    <FundNetValueChart
                      :error="unitNetValueError"
                      :is-loading="unitNetValueIsLoading"
                      :model="unitNetValueChart"
                      view="unit-net-value"
                      :visible="
                        visible &&
                        activeTab === 'performance' &&
                        activePerformanceView === 'unit-net-value'
                      "
                      @retry="emit('retryUnitNetValue')"
                    />
                  </div>
                  <div v-else class="pt-4">
                    <div class="performance-filters">
                      <t-select
                        label="日期范围："
                        :options="historyRangeOptions"
                        :value="selectedCumulativeNetValueRange"
                        @update:value="
                          emit('selectCumulativeNetValueRange', String($event) as FundHistoryRange)
                        "
                      />
                    </div>
                    <FundNetValueChart
                      :error="cumulativeNetValueError"
                      :is-loading="cumulativeNetValueIsLoading"
                      :model="cumulativeNetValueChart"
                      view="cumulative-net-value"
                      :visible="
                        visible &&
                        activeTab === 'performance' &&
                        activePerformanceView === 'cumulative-net-value'
                      "
                      @retry="emit('retryCumulativeNetValue')"
                    />
                  </div>
                </t-tab-panel>
              </t-tabs>
            </div>
            <FundTradingRules
              v-else-if="tab.value === 'trading-rules' && viewModel.tradingRules"
              :rules="viewModel.tradingRules"
            />
            <div
              v-else-if="tab.value !== 'trading-rules'"
              class="flex min-h-56 items-center justify-center py-8"
            >
              <t-empty :description="`${tab.label}功能后续开发`" />
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
    </div>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

.details-toggle {
  @apply flex w-full items-center justify-between gap-3 text-left;
}

.nav-value {
  @apply mt-1 font-mono text-lg font-medium tabular-nums text-(--td-text-color-primary);
}

.details-grid {
  @apply grid grid-cols-3 lg:grid-cols-5;
}

.fund-detail-scroll {
  padding-bottom: env(safe-area-inset-bottom);
}

.performance-filters {
  @apply mb-4 flex w-full sm:w-55 flex-col gap-2 sm:flex-row;
}

:global(.fund-detail-drawer .t-drawer__content-wrapper) {
  @apply max-w-none rounded-none sm:left-1/2 sm:max-w-7xl sm:-translate-x-1/2 sm:rounded-t-md;
}
</style>
