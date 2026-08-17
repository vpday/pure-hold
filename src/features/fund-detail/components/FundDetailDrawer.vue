<script setup lang="ts">
import { ref } from 'vue'

import type { FundDetailTrend, FundDetailViewModel } from '../models/fundDetailViewModel'
import type { BuyTransactionViewModel } from '@/features/fund-transaction/presenters/toBuyTransactionViewModel.ts'
import type {
  RemainingBatchViewModel,
  SellTransactionIssueViewModel,
  SellTransactionViewModel,
} from '@/features/fund-transaction/presenters/toSellTransactionViewModel.ts'
import FundDetailHeader from './FundDetailHeader.vue'
import FundTradingRules from './FundTradingRules.vue'

type FundTransactionViewModel =
  | (BuyTransactionViewModel & { readonly kind: 'buy' })
  | (SellTransactionViewModel & { readonly kind: 'sell' })

defineProps<{
  activeSection: string
  error: string
  isLoading: boolean
  ledgerEnabled: boolean
  remainingBatches: readonly RemainingBatchViewModel[]
  sellIssues: readonly SellTransactionIssueViewModel[]
  size: string
  transactions: readonly FundTransactionViewModel[]
  viewModel: FundDetailViewModel
  visible: boolean
}>()
const emit = defineEmits<{
  close: []
  deleteTransaction: [eventId: string]
  edit: [code: string]
  enableLedger: []
  editTransaction: [eventId: string]
  recordBuy: [code: string]
  recordSell: [code: string]
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

    <div class="fund-detail-layout">
      <div ref="scrollContainer" class="fund-detail-scroll">
        <main class="min-w-0">
          <section
            id="fund-detail-overview"
            aria-labelledby="fund-detail-overview-title"
            class="min-w-0"
          >
            <h2 id="fund-detail-overview-title" class="section-title">基金概览</h2>
            <div class="details-grid mt-4">
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

            <div v-if="viewModel.holding" class="holding-details-grid">
              <div>
                <p class="text-xs text-(--td-text-color-secondary)">估算收益</p>
                <p
                  class="mt-1 font-mono text-lg font-medium tabular-nums"
                  :class="trendClass(viewModel.holding.estimatedIncome.trend)"
                >
                  {{ viewModel.holding.estimatedIncome.amountText }}
                </p>
                <p
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
                  class="font-mono text-xs tabular-nums"
                  :class="trendClass(viewModel.holding.holdingIncome.trend)"
                >
                  {{ viewModel.holding.holdingIncome.percentText }}
                </p>
              </div>
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
            </div>

            <div class="mt-4 pt-4 border-t border-(--td-component-border)">
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
                  <dd class="mt-1 text-(--td-text-color-primary)">
                    {{ viewModel.establishedDateText }}
                  </dd>
                </div>
                <div v-if="viewModel.trackingIndexName && viewModel.trackingIndexName !== '--'">
                  <dt class="text-xs text-(--td-text-color-secondary)">跟踪指数</dt>
                  <dd class="mt-1 wrap-break-word text-(--td-text-color-primary)">
                    {{ viewModel.trackingIndexName }}
                  </dd>
                </div>
              </dl>
            </div>

            <div class="ledger-status-panel">
              <div>
                <p class="font-medium">投资账本</p>
                <p class="mt-1 text-sm text-(--td-text-color-secondary)">
                  {{
                    ledgerEnabled
                      ? '已启用，可记录交易和查看 FIFO。'
                      : '启用后可记录交易和查看 FIFO。'
                  }}
                </p>
              </div>
              <t-tag v-if="ledgerEnabled" theme="success" variant="light">已启用</t-tag>
              <t-button v-else size="small" theme="primary" @click="emit('enableLedger')">
                启用账本
              </t-button>
              <div v-if="ledgerEnabled" class="flex items-center gap-2">
                <t-button size="small" variant="outline" @click="emit('recordBuy', viewModel.code)">
                  记录买入
                </t-button>
                <t-button size="small" theme="primary" @click="emit('recordSell', viewModel.code)">
                  记录卖出
                </t-button>
              </div>
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
            class="detail-section pt-4"
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
            class="detail-section pt-4"
          >
            <h2 id="fund-detail-transactions-title" class="section-title">成交记录</h2>
            <div v-if="transactions.length" class="mt-4 overflow-x-auto">
              <table class="w-full min-w-[72rem] text-sm">
                <thead>
                  <tr class="text-left text-(--td-text-color-secondary)">
                    <th class="pb-2 pr-3">类型</th>
                    <th class="pb-2 pr-3">提交时间</th>
                    <th class="pb-2 pr-3">净值日期</th>
                    <th class="pb-2 pr-3">确认/预计确认</th>
                    <th class="pb-2 pr-3">份额</th>
                    <th class="pb-2 pr-3">单位净值</th>
                    <th class="pb-2 pr-3">金额</th>
                    <th class="pb-2 pr-3">费用</th>
                    <th class="pb-2 pr-3">收益/状态</th>
                    <th class="pb-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="transaction in transactions" :key="transaction.id">
                    <tr v-if="transaction.kind === 'buy'">
                      <td class="py-2 pr-3">买入</td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{ transaction.submittedAtText }}
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{ transaction.navDateText }}
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{
                          transaction.confirmedDateText !== '--'
                            ? transaction.confirmedDateText
                            : transaction.expectedConfirmationDateText
                        }}
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{ transaction.units.text }}
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        <span>{{ transaction.unitNav.text }}</span>
                        <span class="ml-1 text-xs text-(--td-text-color-secondary)">
                          {{ transaction.unitNav.sourceText }}
                        </span>
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{ transaction.totalAmount.text }}
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{ transaction.purchaseFee.text }}
                      </td>
                      <td class="py-2 pr-3">
                        <t-tag
                          size="small"
                          :theme="
                            transaction.status === 'settled-nav-ready' ? 'success' : 'warning'
                          "
                          variant="light"
                        >
                          {{ transaction.statusText }}
                        </t-tag>
                      </td>
                      <td class="py-2">
                        <div class="flex items-center gap-1">
                          <t-button
                            size="small"
                            variant="text"
                            @click="emit('editTransaction', transaction.id)"
                          >
                            编辑
                          </t-button>
                          <t-popconfirm
                            :cancel-btn="{ content: '取消', variant: 'outline' }"
                            :confirm-btn="{ content: '删除', theme: 'danger' }"
                            content="删除这条买入记录？删除后会重新计算持仓。"
                            placement="top-right"
                            :popup-props="{ attach: 'body' }"
                            theme="warning"
                            @confirm="emit('deleteTransaction', transaction.id)"
                          >
                            <t-button size="small" theme="danger" variant="text">删除</t-button>
                          </t-popconfirm>
                        </div>
                      </td>
                    </tr>
                    <tr v-else>
                      <td class="py-2 pr-3">卖出</td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{ transaction.submittedAtText }}
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{ transaction.navDateText }}
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        {{
                          transaction.confirmedDateText !== '--'
                            ? transaction.confirmedDateText
                            : transaction.expectedConfirmationDateText
                        }}
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        <span>{{ transaction.units.text }}</span>
                        <span class="ml-1 text-xs text-(--td-text-color-secondary)">
                          {{ transaction.units.confidenceText }} ·
                          {{ transaction.units.sourceText }}
                        </span>
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        <span>{{ transaction.unitNav.text }}</span>
                        <span class="ml-1 text-xs text-(--td-text-color-secondary)">
                          {{ transaction.unitNav.confidenceText }} ·
                          {{ transaction.unitNav.sourceText }}
                        </span>
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        <span>毛 {{ transaction.grossAmount.text }}</span>
                        <span class="ml-1 text-xs text-(--td-text-color-secondary)">
                          净 {{ transaction.netAmount.text }}
                        </span>
                      </td>
                      <td class="py-2 pr-3 font-mono tabular-nums">
                        <span>{{ transaction.redemptionFee.text }}</span>
                        <span class="ml-1 text-xs text-(--td-text-color-secondary)">
                          {{ transaction.redemptionFee.confidenceText }} ·
                          {{ transaction.redemptionFee.sourceText }}
                        </span>
                      </td>
                      <td class="py-2 pr-3">
                        <span class="block">{{ transaction.realizedGain.text }}</span>
                        <span class="text-xs text-(--td-text-color-secondary)">
                          {{ transaction.realizedGainStatusText }}
                        </span>
                        <t-tag
                          class="mt-1"
                          size="small"
                          :theme="
                            transaction.status === 'settled-nav-ready' ? 'success' : 'warning'
                          "
                          variant="light"
                        >
                          {{ transaction.statusText }}
                        </t-tag>
                      </td>
                      <td class="py-2">
                        <div class="flex items-center gap-1">
                          <t-button
                            size="small"
                            variant="text"
                            @click="emit('editTransaction', transaction.id)"
                          >
                            编辑
                          </t-button>
                          <t-popconfirm
                            :cancel-btn="{ content: '取消', variant: 'outline' }"
                            :confirm-btn="{ content: '删除', theme: 'danger' }"
                            content="删除这条卖出记录？删除后会重新计算 FIFO 和收益。"
                            placement="top-right"
                            :popup-props="{ attach: 'body' }"
                            theme="warning"
                            @confirm="emit('deleteTransaction', transaction.id)"
                          >
                            <t-button size="small" theme="danger" variant="text">删除</t-button>
                          </t-popconfirm>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="transaction.kind === 'sell' && transaction.allocations.length">
                      <td colspan="10" class="border-b border-(--td-component-border) pb-3">
                        <div class="rounded-md bg-(--td-bg-color-secondarycontainer) p-3 text-xs">
                          <p class="font-medium text-(--td-text-color-primary)">FIFO 分配</p>
                          <ul class="mt-2 flex flex-col gap-1">
                            <li
                              v-for="allocation in transaction.allocations"
                              :key="allocation.buyEventId"
                            >
                              买入事件 {{ allocation.buyEventId }}：{{
                                allocation.units.text
                              }}
                              份，成本 {{ allocation.costAmount.text }}（{{
                                allocation.costAmount.confidenceText
                              }}
                              · {{ allocation.costAmount.sourceText }}）
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <div v-if="remainingBatches.length" class="mt-4 overflow-x-auto">
              <h3 class="mb-2 text-sm font-medium">剩余批次</h3>
              <table class="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr class="text-left text-(--td-text-color-secondary)">
                    <th class="pb-2 pr-3">确认日期</th>
                    <th class="pb-2 pr-3">剩余份额</th>
                    <th class="pb-2">剩余成本</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="batch in remainingBatches" :key="batch.eventId">
                    <td class="py-2 pr-3 font-mono tabular-nums">{{ batch.confirmedDateText }}</td>
                    <td class="py-2 pr-3 font-mono tabular-nums">
                      {{ batch.units.text }}（{{ batch.units.confidenceText }} ·
                      {{ batch.units.sourceText }}）
                    </td>
                    <td class="py-2 font-mono tabular-nums">
                      {{ batch.costAmount.text }}（{{ batch.costAmount.confidenceText }} ·
                      {{ batch.costAmount.sourceText }}）
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              v-if="sellIssues.length"
              class="mt-4 rounded-md bg-(--td-error-color-light-9) p-3 text-(--td-error-color)"
            >
              <p class="font-medium">卖出校验问题</p>
              <ul class="mt-1 list-disc pl-5">
                <li v-for="issue in sellIssues" :key="issue.eventId">{{ issue.text }}</li>
              </ul>
            </div>
            <p v-if="!transactions.length" class="section-placeholder">暂无交易记录</p>
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

.details-grid {
  @apply grid gap-3 grid-cols-3 lg:grid-cols-6 lg:gap-6;
}

.holding-details-grid {
  @apply grid gap-3 grid-cols-3 lg:grid-cols-6 lg:gap-6 mt-4 pt-4 border-t border-(--td-component-border);
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
  @apply mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-(--td-component-border) pt-4;
}

:global(.fund-detail-drawer .t-drawer__content-wrapper) {
  @apply max-w-none rounded-none sm:left-1/2 sm:max-w-7xl sm:-translate-x-1/2 sm:rounded-t-md;
}
</style>
