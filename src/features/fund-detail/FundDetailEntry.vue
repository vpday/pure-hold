<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import type { PortfolioCoordinator } from '@/app/portfolio/portfolioCoordinator.ts'
import { calculateFundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import type { CurrentNavByFund } from '@/domains/portfolio/services/calculatePortfolio.ts'
import type { PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDetailDrawer from './components/FundDetailDrawer.vue'
import FundHoldingsSection from './components/FundHoldingsSection.vue'
import FundMetricsSection from './components/FundMetricsSection.vue'
import FundPerformanceSection from './components/FundPerformanceSection.vue'
import FundTransactionsSection from './components/FundTransactionsSection.vue'
import { useFundBenchmarkDataSource } from './composables/useFundBenchmarkDataSource'
import { useFundDetail } from './composables/useFundDetail'
import { useFundHistoryDataSource } from './composables/useFundHistoryDataSource'
import { useFundHoldings } from './composables/useFundHoldings'
import { useFundMetrics } from './composables/useFundMetrics'
import type { FundMetricsRequestResult } from './composables/useFundMetrics'
import { useFundPerformance } from './composables/useFundPerformance'
import { toFundLedgerViewModel, toLedgerRecordViewModels } from './presenters/toFundLedgerViewModel'
import { toFundDetailViewModel } from './presenters/toFundDetailViewModel'

const props = defineProps<{
  portfolio: PortfolioStore
  portfolioCoordinator: PortfolioCoordinator
  portfolioRevision: number
}>()
const emit = defineEmits<{
  deleteTransaction: [eventId: string]
  edit: [code: string]
  editTransaction: [eventId: string]
  recordBuy: [code: string]
  recordSell: [code: string]
}>()
const store = useFundsStore()
const detail = useFundDetail()
const activeSection = ref('overview')
const ledgerRevision = ref(0)
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
const currentNavByFund = computed<CurrentNavByFund>(() => {
  const code = detail.currentCode.value
  const currentSnapshot = snapshot.value
  if (
    !code ||
    !currentSnapshot ||
    currentSnapshot.navDate === null ||
    currentSnapshot.nav === null
  ) {
    return {}
  }
  return {
    [code]: {
      date: currentSnapshot.navDate,
      unitNav: { confidence: 'actual', source: 'platform', value: currentSnapshot.nav },
    },
  }
})
const reconciliation = computed(() => {
  const code = detail.currentCode.value
  if (!code) return undefined
  void props.portfolioRevision
  void ledgerRevision.value
  return props.portfolioCoordinator.reconcileFund({
    asOfDate: shanghaiDate(),
    currentNavByFund: currentNavByFund.value,
    fundCode: code,
  })
})
const ledger = computed(() => {
  const currentReconciliation = reconciliation.value
  return currentReconciliation ? toFundLedgerViewModel(currentReconciliation) : undefined
})
const transactions = computed(() => {
  const code = detail.currentCode.value
  const currentCalculation = reconciliation.value?.calculation
  if (!code || !currentCalculation) return []
  return toLedgerRecordViewModels(props.portfolio.getPortfolio().events, currentCalculation, code)
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

function editTransaction(eventId: string): void {
  emit('editTransaction', eventId)
}

function deleteTransaction(eventId: string): void {
  emit('deleteTransaction', eventId)
}

function recordBuy(): void {
  const code = detail.currentCode.value
  if (!code || !ledger.value?.ledgerEnabled) return
  emit('recordBuy', code)
}

function recordSell(): void {
  const code = detail.currentCode.value
  if (!code || !ledger.value?.ledgerEnabled) return
  emit('recordSell', code)
}

function retryLedger(): void {
  const code = detail.currentCode.value
  if (!code || !ledger.value?.retryAvailable) return
  const result = props.portfolioCoordinator.ensureFundLedger({ fundCode: code })
  ledgerRevision.value += 1
  if (!result.ok) {
    MessagePlugin.error('投资账本自动建立仍未完成，请稍后重试。')
    return
  }
  MessagePlugin.success('投资账本已建立')
}

defineExpose({ open })
</script>

<template>
  <FundDetailDrawer
    v-if="viewModel && ledger"
    :active-section="activeSection"
    :error="detail.error.value"
    :is-loading="detail.isLoading.value"
    :ledger="ledger"
    size="100dvh"
    :view-model="viewModel"
    :visible="detail.visible.value"
    @close="close"
    @edit="edit"
    @retry-ledger="retryLedger"
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
    <template #transactions>
      <FundTransactionsSection
        :ledger="ledger"
        :transactions="transactions"
        @delete-transaction="deleteTransaction"
        @edit-transaction="editTransaction"
        @record-buy="recordBuy"
        @record-sell="recordSell"
      />
    </template>
  </FundDetailDrawer>
</template>
