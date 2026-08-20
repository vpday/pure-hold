<script setup lang="ts">
import { ref } from 'vue'

import type { FundDetailTrend, FundDetailViewModel } from '../models/fundDetailViewModel'
import type { FundLedgerViewModel } from '../presenters/toFundLedgerViewModel'
import FundDetailHeader from './FundDetailHeader.vue'
import FundTradingRules from './FundTradingRules.vue'

defineProps<{
  activeSection: string
  error: string
  isLoading: boolean
  ledger: FundLedgerViewModel
  viewModel: FundDetailViewModel
  visible: boolean
}>()
const emit = defineEmits<{
  close: []
  edit: [code: string]
  retryLedger: []
  retry: []
  selectSection: [section: string]
}>()

const sections = [
  { href: '#fund-detail-overview', label: '基金概览', value: 'overview' },
  { href: '#fund-detail-performance', label: '业绩表现', value: 'performance' },
  { href: '#fund-detail-metrics', label: '数据指标', value: 'metrics' },
  { href: '#fund-detail-holdings', label: '持仓构成', value: 'holdings' },
  { href: '#fund-detail-trading-rules', label: '交易规则', value: 'trading-rules' },
  { href: '#fund-detail-transactions', label: '成交记录', value: 'transactions' },
] as const

const scrollContainer = ref<HTMLElement>()
const sectionTargetOffset = 64
const overviewDetailsPanel = 'overview-details'
const expandedOverviewPanels = ref<(number | string)[]>([])

function trendClass(trend: FundDetailTrend): string {
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  return 'text-(--td-text-color-primary)'
}

function getScrollContainer(): HTMLElement | undefined {
  return scrollContainer.value
}

function syncSectionFromAnchor(href: string): void {
  const section = sections.find((candidate) => candidate.href === href)
  if (section) emit('selectSection', section.value)
}

function preventAnchorHash(context: { e: MouseEvent }): void {
  context.e.preventDefault()
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
    size="100dvh"
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

    <div class="fund-detail-layout">
      <div ref="scrollContainer" class="fund-detail-scroll">
        <main class="min-w-0">
          <section
            id="fund-detail-overview"
            aria-labelledby="fund-detail-overview-title"
            class="min-w-0"
          >
            <h2 id="fund-detail-overview-title" class="section-title">基金概览</h2>
            <div class="quote-grid my-4">
              <div v-if="viewModel.estimatedNavText !== '--'">
                <p class="text-xs text-(--td-text-color-secondary)">净值估算</p>
                <p class="nav-value">
                  {{ viewModel.estimatedNavText }}
                </p>
                <p class="font-mono text-xs tabular-nums">
                  {{ viewModel.estimatedAtTimeText }}
                </p>
              </div>
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
                <p class="font-mono text-xs tabular-nums">
                  {{ viewModel.navDateText }}
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

            <t-collapse v-model:value="expandedOverviewPanels" expand-icon-placement="right">
              <t-collapse-panel :value="overviewDetailsPanel" header="更多">
                <div v-if="viewModel.holding">
                  <div class="holding-details-row">
                    <div>
                      <p class="text-xs text-(--td-text-color-secondary)">估算收益</p>
                      <p
                        class="mt-1 font-mono text-lg font-medium tabular-nums"
                        :class="trendClass(viewModel.holding.estimatedIncome.trend)"
                      >
                        {{ viewModel.holding.estimatedIncome.amountText }}
                      </p>
                      <p
                        v-if="viewModel.holding.estimatedIncome.percentText !== '--'"
                        class="font-mono text-xs tabular-nums"
                        :class="trendClass(viewModel.holding.estimatedIncome.trend)"
                      >
                        {{ viewModel.holding.estimatedIncome.percentText }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-(--td-text-color-secondary)">今日收益</p>
                      <p
                        class="mt-1 font-mono text-lg font-medium tabular-nums"
                        :class="trendClass(viewModel.holding.todayIncome.trend)"
                      >
                        {{ viewModel.holding.todayIncome.amountText }}
                      </p>
                      <p
                        v-if="viewModel.holding.todayIncome.percentText !== '--'"
                        class="font-mono text-xs tabular-nums"
                        :class="trendClass(viewModel.holding.todayIncome.trend)"
                      >
                        {{ viewModel.holding.todayIncome.percentText }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-(--td-text-color-secondary)">昨日收益</p>
                      <p
                        class="mt-1 font-mono text-lg font-medium tabular-nums"
                        :class="trendClass(viewModel.holding.yesterdayIncome.trend)"
                      >
                        {{ viewModel.holding.yesterdayIncome.amountText }}
                      </p>
                      <p
                        v-if="viewModel.holding.yesterdayIncome.percentText !== '--'"
                        class="font-mono text-xs tabular-nums"
                        :class="trendClass(viewModel.holding.yesterdayIncome.trend)"
                      >
                        {{ viewModel.holding.yesterdayIncome.percentText }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-(--td-text-color-secondary)">持仓收益</p>
                      <p
                        class="mt-1 font-mono text-lg font-medium tabular-nums"
                        :class="trendClass(viewModel.holding.holdingIncome.trend)"
                      >
                        {{ viewModel.holding.holdingIncome.amountText }}
                      </p>
                      <p
                        v-if="viewModel.holding.holdingIncome.percentText !== '--'"
                        class="font-mono text-xs tabular-nums"
                        :class="trendClass(viewModel.holding.holdingIncome.trend)"
                      >
                        {{ viewModel.holding.holdingIncome.percentText }}
                      </p>
                    </div>
                  </div>
                  <div class="holding-details-row">
                    <div>
                      <p class="text-xs text-(--td-text-color-secondary)">持仓金额</p>
                      <p class="mt-1 font-mono text-lg font-medium tabular-nums">
                        {{ viewModel.holding.holdingAmountText }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-(--td-text-color-secondary)">持有天数</p>
                      <p class="mt-1 font-mono text-lg font-medium tabular-nums">
                        {{ viewModel.holding.holdingDaysText }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-(--td-text-color-secondary)">可用份额</p>
                      <p class="mt-1 font-mono text-lg font-medium tabular-nums">
                        {{ viewModel.holding.availableUnitsText }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-(--td-text-color-secondary)">持仓成本价</p>
                      <p class="mt-1 font-mono text-lg font-medium tabular-nums">
                        {{ ledger.position?.averageCost.text ?? '--' }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="fund-profile-panel">
                  <t-skeleton v-if="isLoading" animation="gradient" :row-col="[1, 1]" />
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
                  <div v-else>
                    <div class="fund-profile-grid">
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
                        <dd class="mt-1 text-(--td-text-color-primary)">
                          {{ viewModel.establishedDateText }}
                        </dd>
                      </div>
                    </div>
                    <div
                      v-if="viewModel.trackingIndexName && viewModel.trackingIndexName !== '--'"
                      class="mt-4"
                    >
                      <dt class="text-xs text-(--td-text-color-secondary)">跟踪指数</dt>
                      <dd class="mt-1 wrap-break-word text-(--td-text-color-primary)">
                        {{ viewModel.trackingIndexName }}
                      </dd>
                    </div>
                  </div>
                </div>
              </t-collapse-panel>
            </t-collapse>
            <div class="ledger-status-panel" v-if="ledger.retryAvailable">
              <div class="ledger-status-header">
                <div>
                  <p class="font-medium">投资账本</p>
                  <p class="mt-1 text-sm text-(--td-text-color-secondary)">
                    {{
                      ledger.status === 'synced'
                        ? '交易记录和持仓信息已同步。'
                        : '交易记录已保留，请按状态补全或重试同步。'
                    }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <t-tag :theme="ledger.statusTone" variant="light">
                    {{ ledger.statusText }}
                  </t-tag>
                  <t-button size="small" variant="outline" @click="emit('retryLedger')">
                    重试同步
                  </t-button>
                </div>
              </div>
              <p v-if="ledger.hasPartialPersistence" class="mt-2 text-sm text-(--td-warning-color)">
                本次操作可能已部分持久化，请通过重试或导出配置检查结果。
              </p>
            </div>
          </section>

          <section
            id="fund-detail-performance"
            aria-labelledby="fund-detail-performance-title"
            class="detail-section min-w-0"
          >
            <slot name="performance" />
          </section>

          <section
            id="fund-detail-metrics"
            aria-labelledby="fund-detail-metrics-title"
            class="detail-section min-w-0"
          >
            <slot name="metrics" />
          </section>

          <section
            id="fund-detail-holdings"
            aria-labelledby="fund-detail-holdings-title"
            class="detail-section min-w-0"
          >
            <slot name="holdings" />
          </section>

          <section
            id="fund-detail-trading-rules"
            aria-labelledby="fund-detail-trading-rules-title"
            class="detail-section min-w-0 pt-4"
          >
            <h2 id="fund-detail-trading-rules-title" class="section-title">交易规则</h2>
            <FundTradingRules
              class="mt-4"
              v-if="viewModel.tradingRules"
              :rules="viewModel.tradingRules"
            />
            <p v-else class="section-placeholder">暂无交易规则</p>
          </section>

          <section
            id="fund-detail-transactions"
            aria-labelledby="fund-detail-transactions-title"
            class="detail-section min-w-0 pt-4"
          >
            <slot name="transactions" />
          </section>
        </main>
      </div>

      <aside
        v-if="scrollContainer"
        class="hidden self-start lg:block"
        aria-label="基金详情章节导航"
      >
        <t-anchor
          size="small"
          :container="getScrollContainer"
          :target-offset="sectionTargetOffset"
          @change="syncSectionFromAnchor"
          @click="preventAnchorHash"
        >
          <t-anchor-item
            v-for="section in sections"
            :key="section.value"
            :href="section.href"
            :title="section.label"
          />
        </t-anchor>
      </aside>
    </div>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

.nav-value {
  @apply mt-1 font-mono text-lg font-medium tabular-nums text-(--td-text-color-primary);
}

.quote-grid {
  @apply grid grid-cols-2 gap-4 sm:grid-cols-4;
}

.holding-details-row {
  @apply grid grid-cols-2 gap-4 sm:grid-cols-4;
}

.holding-details-row + .holding-details-row {
  @apply mt-4;
}

.fund-profile-grid {
  @apply grid grid-cols-2 gap-4 sm:grid-cols-4;
}

.fund-profile-panel {
  @apply mt-4 pt-4 border-t border-(--td-component-border);
}

.detail-section {
  @apply mt-4 border-t border-(--td-component-border);
}

.fund-detail-scroll {
  @apply h-full overflow-y-auto scrollbar-none;
  padding-bottom: env(safe-area-inset-bottom);
}

.fund-detail-scroll::-webkit-scrollbar {
  display: none;
}

.fund-detail-layout {
  @apply grid h-full lg:grid-cols-[minmax(0,1fr)_7rem] lg:gap-4;
}

.section-placeholder {
  @apply mt-4 rounded-md bg-(--td-bg-color-secondarycontainer) px-4 py-3 text-sm text-(--td-text-color-secondary);
}

.section-title {
  @apply text-lg font-medium text-(--td-text-color-primary);
}

.ledger-status-panel {
  @apply mt-4 border-t border-(--td-component-border) pt-4;
}

.ledger-status-header {
  @apply flex flex-wrap items-center justify-between gap-3;
}

:global(.fund-detail-drawer .t-drawer__content-wrapper) {
  @apply sm:left-1/2 sm:max-w-7xl sm:-translate-x-1/2;
}

:global(.t-collapse-panel__wrapper .t-collapse-panel__content) {
  padding: var(--td-comp-paddingTB-m) var(--td-comp-paddingLR-l) var(--td-comp-paddingTB-m)
    var(--td-comp-paddingLR-l);
}
</style>
