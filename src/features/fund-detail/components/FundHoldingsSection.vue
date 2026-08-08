<script setup lang="ts">
import type { TableProps } from 'tdesign-vue-next'

import FundAssetAllocationChart from './FundAssetAllocationChart.vue'
import type {
  FundBondHoldingRow,
  FundHoldingsSectionModel,
  FundHoldingsTrend,
  FundHoldingsView,
  FundStockHoldingRow,
} from '../models/fundHoldingsSectionModel.ts'

defineProps<{ model: FundHoldingsSectionModel }>()
const emit = defineEmits<{
  retryAllocation: []
  retryHoldings: []
  retryQuotes: []
  selectReportDate: [reportDate: string]
  selectView: [view: FundHoldingsView]
}>()

const tabs = [
  { label: '持仓信息', value: 'positions' },
  { label: '资产配置', value: 'allocation' },
] as const
const stockColumns: TableProps<FundStockHoldingRow>['columns'] = [
  { cell: 'name', colKey: 'name', title: '股票名称' },
  { cell: 'price', colKey: 'priceText', title: '价格' },
  { cell: 'net-asset-percent', colKey: 'netAssetPercentText', title: '持仓占比' },
  { cell: 'change', colKey: 'changeText', title: '较上期' },
]
const bondColumns: TableProps<FundBondHoldingRow>['columns'] = [
  { cell: 'name', colKey: 'name', title: '债券名称' },
  { cell: 'net-asset-percent', colKey: 'netAssetPercentText', title: '持仓占比' },
  { cell: 'price', colKey: 'priceText', title: '价格' },
]

function trendClass(trend: FundHoldingsTrend): string {
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  if (trend === 'unknown') return 'text-(--td-text-color-placeholder)'
  return 'text-(--td-text-color-primary)'
}
</script>

<template>
  <div class="holdings-section">
    <h2 id="fund-detail-holdings-title" class="holdings-title">持仓构成</h2>
    <t-tabs
      class="holdings-tabs"
      :value="model.activeView"
      @update:value="emit('selectView', String($event) as FundHoldingsView)"
    >
      <t-tab-panel v-for="tab in tabs" :key="tab.value" :label="tab.label" :value="tab.value">
        <div v-if="tab.value === 'positions'" class="pt-4">
          <t-skeleton
            v-if="model.isDatesLoading && !model.reportDateOptions.length"
            animation="gradient"
          />
          <template v-else>
            <t-alert v-if="model.holdingsError" class="mb-4" theme="error">
              <template #message>{{ model.holdingsError }}</template>
              <template #operation>
                <t-button size="small" theme="danger" variant="text" @click="emit('retryHoldings')">
                  重试
                </t-button>
              </template>
            </t-alert>
            <template v-else>
              <t-alert
                v-if="model.holdingsWarning"
                class="mb-4"
                theme="warning"
                :message="model.holdingsWarning"
              >
                <template #operation>
                  <t-button size="small" variant="text" @click="emit('retryHoldings')">
                    重试
                  </t-button>
                </template>
              </t-alert>
              <t-alert
                v-if="model.quoteWarning"
                class="mb-4"
                theme="warning"
                :message="model.quoteWarning"
              >
                <template #operation>
                  <t-button size="small" variant="text" @click="emit('retryQuotes')">
                    重试行情
                  </t-button>
                </template>
              </t-alert>

              <div class="mb-4 w-full sm:w-55">
                <t-select
                  label="报告日期："
                  :loading="model.isDatesLoading"
                  :options="model.reportDateOptions"
                  :value="model.selectedReportDate"
                  @update:value="emit('selectReportDate', String($event))"
                />
              </div>

              <div class="holdings-tables">
                <section class="min-w-0">
                  <div class="mb-3 flex flex-wrap items-center gap-2">
                    <h3 class="text-base font-medium">股票持仓</h3>
                    <t-tag v-if="model.stockHoldingsSource" size="small">
                      来自目标 ETF<span v-if="model.stockHoldingsSource.name"
                        >：{{ model.stockHoldingsSource.name }}</span
                      >（{{ model.stockHoldingsSource.code }}）
                    </t-tag>
                  </div>
                  <t-table
                    bordered
                    :columns="stockColumns"
                    :data="model.stocks"
                    empty="暂无股票持仓"
                    :loading="model.isHoldingsLoading"
                    row-key="code"
                    size="small"
                    table-layout="auto"
                    :max-height="400"
                  >
                    <template #name="{ row }">
                      <div>
                        <p>{{ row.name }}</p>
                        <div class="mt-1 flex flex-wrap gap-1">
                          <t-tag
                            v-if="row.market === 'hk' || row.market === 'us'"
                            size="small"
                            variant="light"
                          >
                            {{ row.market === 'hk' ? 'HK' : 'US' }}
                          </t-tag>
                          <t-tag v-if="row.industryName" size="small" variant="light">
                            {{ row.industryName }}
                          </t-tag>
                        </div>
                      </div>
                    </template>
                    <template #price="{ row }">
                      <div class="holding-number" :class="trendClass(row.priceTrend)">
                        <p>{{ row.priceText }}</p>
                        <p class="text-xs">{{ row.dailyChangePercentText }}</p>
                      </div>
                    </template>
                    <template #net-asset-percent="{ row }">
                      <span class="holding-number">{{ row.netAssetPercentText }}</span>
                    </template>
                    <template #change="{ row }">
                      <div :class="trendClass(row.changeTrend)">
                        <p class="holding-number">{{ row.changeText }}</p>
                        <p
                          v-if="row.heavyQuarterText"
                          class="mt-1 text-xs text-(--td-text-color-secondary)"
                        >
                          {{ row.heavyQuarterText }}
                        </p>
                      </div>
                    </template>
                  </t-table>
                  <div class="holding-summary">
                    <p>
                      {{ model.stockTotalLabel }}：<span class="holding-number">{{
                        model.stockTotalText
                      }}</span>
                    </p>
                    <p>持仓截止日期：{{ model.reportDateText }}</p>
                  </div>
                </section>

                <section class="min-w-0">
                  <h3 class="mb-3 text-base font-medium">债券持仓</h3>
                  <t-table
                    bordered
                    :columns="bondColumns"
                    :data="model.bonds"
                    empty="暂无债券持仓"
                    :loading="model.isHoldingsLoading"
                    row-key="code"
                    size="small"
                    table-layout="auto"
                    :max-height="400"
                  >
                    <template #name="{ row }">
                      <span>{{ row.name }}</span>
                    </template>
                    <template #net-asset-percent="{ row }">
                      <span class="holding-number">{{ row.netAssetPercentText }}</span>
                    </template>
                    <template #price="{ row }">
                      <div class="holding-number" :class="trendClass(row.priceTrend)">
                        <p>{{ row.priceText }}</p>
                        <p class="text-xs">{{ row.dailyChangePercentText }}</p>
                      </div>
                    </template>
                  </t-table>
                  <div class="holding-summary">
                    <p>
                      {{ model.bondTotalLabel }}：<span class="holding-number">{{
                        model.bondTotalText
                      }}</span>
                    </p>
                    <p>持仓截止日期：{{ model.reportDateText }}</p>
                  </div>
                </section>
              </div>
            </template>
          </template>
        </div>
        <div v-else class="pt-4">
          <FundAssetAllocationChart
            :error="model.allocation.error"
            :is-loading="model.allocation.isLoading"
            :model="model.allocation.chart"
            :visible="model.allocation.visible"
            :warning="model.allocation.warning"
            @retry="emit('retryAllocation')"
          />
        </div>
      </t-tab-panel>
    </t-tabs>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.holdings-section {
  @apply mt-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4;
}

.holdings-title {
  @apply flex h-12 items-center text-lg font-medium text-(--td-text-color-primary);
}

.holdings-tabs {
  display: contents;
}

.holdings-tabs :deep(.t-tabs__header) {
  @apply col-start-2 row-start-1 min-w-0;
}

.holdings-tabs :deep(.t-tabs__content) {
  @apply col-span-2 row-start-2 min-w-0;
}

.holdings-tables {
  @apply grid grid-cols-1 gap-4 lg:grid-cols-2;
}

.holding-number {
  @apply font-mono tabular-nums;
}

.holding-summary {
  @apply flex flex-wrap justify-between mt-4 text-xs text-(--td-text-color-placeholder);
}
</style>
