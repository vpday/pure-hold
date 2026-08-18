<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import type {
  PortfolioCoordinationStatus,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { calculateFundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import type { CurrentNavByFund } from '@/domains/portfolio/services/calculatePortfolio.ts'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDetailDrawer from './components/FundDetailDrawer.vue'
import FundHoldingCorrectionDialog from './components/FundHoldingCorrectionDialog.vue'
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
import {
  createFundHoldingCorrectionDraft,
  type FundHoldingCorrectionDraft,
  type FundHoldingCorrectionDraftErrors,
  validateFundHoldingCorrectionDraft,
} from './models/fundHoldingCorrectionDraft'
import { toFundLedgerViewModel, toLedgerRecordViewModels } from './presenters/toFundLedgerViewModel'
import { toFundDetailViewModel } from './presenters/toFundDetailViewModel'

const props = defineProps<{
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
const correctionVisible = ref(false)
const correctionDraft = ref<FundHoldingCorrectionDraft>(createFundHoldingCorrectionDraft())
const correctionErrors = ref<FundHoldingCorrectionDraftErrors>({})
const correctionSubmitError = ref('')
const correctionSubmitting = ref(false)
const correctionEventId = ref<string>()
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
const ledgerState = computed(() => {
  const code = detail.currentCode.value
  if (!code) return undefined
  void props.portfolioRevision
  void ledgerRevision.value
  return props.portfolioCoordinator.getFundLedgerState({
    asOfDate: shanghaiDate(),
    currentNavByFund: currentNavByFund.value,
    fundCode: code,
  })
})
const ledger = computed(() => {
  const state = ledgerState.value
  return state ? toFundLedgerViewModel(state) : undefined
})
const transactions = computed(() => {
  const code = detail.currentCode.value
  const state = ledgerState.value
  if (!code || !state) return []
  return toLedgerRecordViewModels(
    props.portfolioCoordinator.getPortfolio().events,
    state.calculation,
    code,
  )
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
  correctionVisible.value = false
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
  if (!code || !ledger.value?.canRecord) return
  emit('recordBuy', code)
}

function recordSell(): void {
  const code = detail.currentCode.value
  if (!code || !ledger.value?.canRecord) return
  emit('recordSell', code)
}

function openCorrection(): void {
  const code = detail.currentCode.value
  const state = ledgerState.value
  if (!code || !state?.canCorrect) return
  correctionDraft.value = createFundHoldingCorrectionDraft(
    state.ledger?.units.value ?? 0,
    state.ledger?.costAmount.value ?? 0,
  )
  correctionErrors.value = {}
  correctionSubmitError.value = ''
  correctionEventId.value = createCorrectionEventId(code)
  correctionVisible.value = true
}

function closeCorrection(): void {
  correctionVisible.value = false
  correctionErrors.value = {}
  correctionSubmitError.value = ''
}

function submitCorrection(): void {
  const code = detail.currentCode.value
  if (!code || !correctionVisible.value || correctionSubmitting.value) return
  const validation = validateFundHoldingCorrectionDraft(correctionDraft.value)
  correctionErrors.value = validation.errors
  correctionSubmitError.value = ''
  if (!validation.input) return

  correctionSubmitting.value = true
  const result = props.portfolioCoordinator.commitHoldingCorrection({
    ...validation.input,
    asOfDate: shanghaiDate(),
    currentNavByFund: currentNavByFund.value,
    eventId: correctionEventId.value,
    fundCode: code,
  })
  correctionSubmitting.value = false
  if (isBlockingCoordinationStatus(result.status)) {
    correctionSubmitError.value = coordinationFailureText(result.status, result.partialPersistence)
    return
  }

  ledgerRevision.value += 1
  closeCorrection()
  if (result.status === 'synced') MessagePlugin.success('手工修正已保存，持仓已同步')
  else MessagePlugin.warning(`手工修正已保存，当前状态：${coordinationStatusText(result.status)}`)
}

function retryLedger(): void {
  const code = detail.currentCode.value
  if (!code || !ledger.value?.retryAvailable) return
  const result = props.portfolioCoordinator.rebuildHoldingProjections({
    asOfDate: shanghaiDate(),
    currentNavByFund: currentNavByFund.value,
  })
  ledgerRevision.value += 1
  const currentResult = result.results.find(({ fundCode }) => fundCode === code)
  if (currentResult && isBlockingCoordinationStatus(currentResult.status)) {
    MessagePlugin.error(
      coordinationFailureText(currentResult.status, currentResult.partialPersistence),
    )
    return
  }
  if (result.status === 'synced') MessagePlugin.success('投资账本已同步')
  else MessagePlugin.warning('投资账本已重试，但仍需补全或继续同步')
}

function createCorrectionEventId(code: string): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? String(Date.now())
  return `adjustment:${code}:${suffix}`
}

function isBlockingCoordinationStatus(status: PortfolioCoordinationStatus): boolean {
  return (
    status === 'ledger-error' ||
    status === 'portfolio-persistence-failed' ||
    status === 'holding-sync-failed'
  )
}

function coordinationFailureText(
  status: PortfolioCoordinationStatus,
  partialPersistence = false,
): string {
  const retryText = partialPersistence ? '数据可能已部分持久化，请重试并检查账本' : '请重试'
  if (status === 'ledger-error') return `账本计算异常，${retryText}`
  if (status === 'portfolio-persistence-failed') return `账本记录保存失败，${retryText}`
  if (status === 'holding-sync-failed') return `持仓同步失败，${retryText}`
  return '操作仍待完成，请稍后重试'
}

function coordinationStatusText(status: PortfolioCoordinationStatus): string {
  if (status === 'synced') return '已同步'
  if (status === 'pending-confirmation') return '待确认'
  if (status === 'pending-exact-data') return '待精确数据'
  if (status === 'ledger-error') return '账本异常'
  if (status === 'portfolio-persistence-failed') return '账本记录保存失败'
  return '持仓同步失败'
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
        @correct="openCorrection"
        @delete-transaction="deleteTransaction"
        @edit-transaction="editTransaction"
        @record-buy="recordBuy"
        @record-sell="recordSell"
      />
    </template>
  </FundDetailDrawer>
  <FundHoldingCorrectionDialog
    v-if="correctionVisible"
    v-model:visible="correctionVisible"
    :draft="correctionDraft"
    :errors="correctionErrors"
    :submit-error="correctionSubmitError"
    :submitting="correctionSubmitting"
    @close="closeCorrection"
    @submit="submitCorrection"
  />
</template>
