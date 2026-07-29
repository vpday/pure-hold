<script setup lang="ts">
import type { FundDetailTrend, FundDetailViewModel } from '../models/fundDetailViewModel'
import FundDetailHeader from './FundDetailHeader.vue'
import FundTradingRules from './FundTradingRules.vue'

defineProps<{
  activeTab: string
  error: string
  isLoading: boolean
  size: string
  viewModel: FundDetailViewModel
  visible: boolean
}>()
const emit = defineEmits<{
  close: []
  edit: [code: string]
  retry: []
  selectTab: [tab: string]
  toggleDetails: []
}>()

const tabs = [
  { label: '业绩表现', value: 'performance' },
  { label: '数据指标', value: 'metrics' },
  { label: '持仓构成', value: 'holdings' },
  { label: '交易规则', value: 'trading-rules' },
  { label: '成交记录', value: 'transactions' },
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
      <div class="grid grid-cols-4 gap-4">
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
          <div v-if="viewModel.trackingErrorText && viewModel.trackingErrorText !== '--'">
            <dt class="text-xs text-(--td-text-color-secondary)">跟踪误差</dt>
            <dd class="mt-1 font-mono tabular-nums text-(--td-text-color-primary)">
              {{ viewModel.trackingErrorText }}
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
            <FundTradingRules
              v-if="tab.value === 'trading-rules' && viewModel.tradingRules"
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
  @apply grid grid-cols-3 gap-x-8 gap-y-4 lg:grid-cols-4;
}

.fund-detail-scroll {
  padding-bottom: env(safe-area-inset-bottom);
}

:global(.fund-detail-drawer .t-drawer__content-wrapper) {
  @apply max-w-none rounded-none sm:left-1/2 sm:max-w-7xl sm:-translate-x-1/2 sm:rounded-t-md;
}
</style>
