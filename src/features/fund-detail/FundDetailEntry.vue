<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { calculateFundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import type { PortfolioBuyEvent, PortfolioSellEvent } from '@/domains/portfolio/models/index.ts'
import type { PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDetailDrawer from './components/FundDetailDrawer.vue'
import FundHoldingsSection from './components/FundHoldingsSection.vue'
import FundMetricsSection from './components/FundMetricsSection.vue'
import FundPerformanceSection from './components/FundPerformanceSection.vue'
import { useFundBenchmarkDataSource } from './composables/useFundBenchmarkDataSource'
import { useFundDetail } from './composables/useFundDetail'
import { useFundHistoryDataSource } from './composables/useFundHistoryDataSource'
import { useFundHoldings } from './composables/useFundHoldings'
import { useFundMetrics } from './composables/useFundMetrics'
import type { FundMetricsRequestResult } from './composables/useFundMetrics'
import { useFundPerformance } from './composables/useFundPerformance'
import { toFundDetailViewModel } from './presenters/toFundDetailViewModel'
import { toBuyTransactionViewModel } from '@/features/fund-transaction/presenters/toBuyTransactionViewModel.ts'
import {
  toRemainingBatchViewModels,
  toSellTransactionIssueViewModels,
  toSellTransactionViewModel,
} from '@/features/fund-transaction/presenters/toSellTransactionViewModel.ts'
import type {
  RemainingBatchViewModel,
  SellTransactionIssueViewModel,
  SellTransactionViewModel,
} from '@/features/fund-transaction/presenters/toSellTransactionViewModel.ts'
import type { BuyTransactionViewModel } from '@/features/fund-transaction/presenters/toBuyTransactionViewModel.ts'

const props = defineProps<{
  enableLedger: (fundCode: string) => boolean
  portfolio: PortfolioStore
}>()
const emit = defineEmits<{
  edit: [code: string]
}>()
type FundTransactionViewModel =
  | (BuyTransactionViewModel & { readonly kind: 'buy' })
  | (SellTransactionViewModel & { readonly kind: 'sell' })
const store = useFundsStore()
const detail = useFundDetail()
const activeSection = ref('overview')
const ledgerEnabled = ref(false)
const historyDataSource = useFundHistoryDataSource()
const benchmarkDataSource = useFundBenchmarkDataSource()
const performance = useFundPerformance(
  () => detail.visible.value && activeSection.value === 'performance',
  { benchmarkDataSource, historyDataSource },
)
const metrics = useFundMetrics(historyDataSource, benchmarkDataSource)
const holdings = useFundHoldings(() => detail.visible.value && activeSection.value === 'holdings')
const snapshot = computed(() => {
  const code = detail.currentCode.value
  return code ? store.snapshotsByCode[code] : undefined
})
const holdingMetrics = computed(() => {
  const code = detail.currentCode.value
  const currentSnapshot = snapshot.value
  const holding = code ? store.holdingsByCode[code] : undefined
  if (!code || !currentSnapshot || !holding) return undefined

  return calculateFundHoldingMetrics({
    currentSnapshot,
    holding,
    previousConfirmedSnapshot: store.previousSnapshotsByCode[code],
    today: shanghaiDate(),
  })
})
const viewModel = computed(() => {
  const currentSnapshot = snapshot.value
  return currentSnapshot
    ? toFundDetailViewModel(currentSnapshot, detail.basicInfo.value, holdingMetrics.value)
    : undefined
})
const calculation = computed(() => {
  const code = detail.currentCode.value
  return code
    ? props.portfolio.calculate({ asOfDate: shanghaiDate(), currentNavByFund: {} })
    : undefined
})
const transactions = computed<readonly FundTransactionViewModel[]>(() => {
  const code = detail.currentCode.value
  const currentCalculation = calculation.value
  if (!code || !currentCalculation) return []
  return props.portfolio
    .getPortfolio()
    .events.filter(
      (event): event is PortfolioBuyEvent | PortfolioSellEvent =>
        event.fundCode === code && (event.kind === 'buy' || event.kind === 'sell'),
    )
    .sort((left, right) => {
      const leftDate = left.confirmedDate ?? left.navDate
      const rightDate = right.confirmedDate ?? right.navDate
      return leftDate.localeCompare(rightDate)
    })
    .map((event) => {
      if (event.kind === 'buy') {
        return { kind: 'buy' as const, ...toBuyTransactionViewModel(event, currentCalculation) }
      }
      return { kind: 'sell' as const, ...toSellTransactionViewModel(event, currentCalculation) }
    })
})
const remainingBatches = computed<readonly RemainingBatchViewModel[]>(() => {
  const code = detail.currentCode.value
  const currentCalculation = calculation.value
  return code && currentCalculation ? toRemainingBatchViewModels(currentCalculation, code) : []
})
const sellIssues = computed<readonly SellTransactionIssueViewModel[]>(() => {
  const code = detail.currentCode.value
  const currentCalculation = calculation.value
  return code && currentCalculation
    ? toSellTransactionIssueViewModels(currentCalculation, code)
    : []
})
watch([detail.visible, detail.currentCode, detail.basicInfo], ([visible, code, basicInfo]) => {
  if (visible && code && basicInfo) {
    void performance.updateBasicInfo(code, basicInfo)
  }
})
watch([detail.visible, activeSection], ([visible, section]) => {
  if (visible && (section === 'performance' || section === 'metrics')) void activateMetrics()
  if (visible && (section === 'metrics' || section === 'holdings')) void holdings.activate()
})

let unsubscribeRefresh: (() => void) | undefined
onMounted(() => {
  unsubscribeRefresh = subscribeGlobalRefresh(refresh)
  void benchmarkDataSource.load().catch(() => undefined)
})
onBeforeUnmount(() => {
  unsubscribeRefresh?.()
  performance.close()
  metrics.close()
  holdings.close()
  benchmarkDataSource.dispose()
  historyDataSource.dispose()
})

function open(code: string): void {
  const currentSnapshot = store.snapshotsByCode[code]
  if (!store.fundOrder.includes(code) || !currentSnapshot) {
    detail.close()
    MessagePlugin.error('基金不存在，无法查看详情')
    return
  }
  activeSection.value = 'overview'
  ledgerEnabled.value = props.portfolio.getPortfolio().fundCodes.includes(code)
  performance.open(code)
  metrics.open(code)
  holdings.open(code)
  void detail.open(code)
}

function close(): void {
  detail.close()
  performance.close()
  metrics.close()
  holdings.close()
}

function handleEnableLedger(): void {
  const code = detail.currentCode.value
  if (!code || ledgerEnabled.value) return
  if (props.enableLedger(code)) ledgerEnabled.value = true
}

async function refresh(): Promise<void> {
  const [, , metricsResult] = await Promise.all([
    detail.refresh(),
    performance.refresh(),
    metrics.refresh(),
    holdings.refresh(),
  ])
  showMetricsRefreshWarning(metricsResult)
}

async function activateMetrics(): Promise<void> {
  await metrics.activate()
}

async function retryMetrics(): Promise<void> {
  showMetricsRefreshWarning(await metrics.retry())
}

function showMetricsRefreshWarning(result: FundMetricsRequestResult): void {
  if (result === 'showing-stale-data') {
    void MessagePlugin.warning('沪深300全收益基准刷新失败')
  }
}

function shanghaiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

async function edit(code: string): Promise<void> {
  close()
  await nextTick()
  emit('edit', code)
}

defineExpose({ open })
</script>

<template>
  <FundDetailDrawer
    v-if="viewModel"
    :active-section="activeSection"
    :ledger-enabled="ledgerEnabled"
    :error="detail.error.value"
    :is-loading="detail.isLoading.value"
    :remaining-batches="remainingBatches"
    :sell-issues="sellIssues"
    :transactions="transactions"
    :size="'100dvh'"
    :view-model="viewModel"
    :visible="detail.visible.value"
    @close="close"
    @enable-ledger="handleEnableLedger"
    @edit="edit"
    @retry="detail.retry"
    @select-section="activeSection = $event"
  >
    <template #performance>
      <FundPerformanceSection
        :key="detail.currentCode.value"
        :model="performance.model.value"
        @action="performance.dispatch"
      />
    </template>
    <template #metrics>
      <FundMetricsSection
        :active-view="metrics.activeView.value"
        :error="metrics.error.value"
        :is-loading="metrics.isLoading.value"
        :model="metrics.model.value"
        @apply-risk-assumptions="metrics.applyRiskAssumptions"
        @retry="retryMetrics"
        @select-view="metrics.selectView"
        @update-risk-free-rate="metrics.updateRiskFreeRateDraft"
        @update-target-rate="metrics.updateTargetRateDraft"
      />
    </template>
    <template #holdings>
      <FundHoldingsSection
        :model="holdings.model.value"
        @retry-allocation="holdings.retryAllocation"
        @retry-holdings="holdings.retryHoldings"
        @retry-quotes="holdings.retryQuotes"
        @select-report-date="holdings.selectReportDate"
        @select-view="holdings.selectView"
      />
    </template>
  </FundDetailDrawer>
</template>
