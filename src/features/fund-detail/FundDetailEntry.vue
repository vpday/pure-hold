<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
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

const emit = defineEmits<{ edit: [code: string] }>()
const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const detail = useFundDetail()
const activeSection = ref('overview')
const historyDataSource = useFundHistoryDataSource()
const benchmarkDataSource = useFundBenchmarkDataSource()
const performance = useFundPerformance(
  () => detail.visible.value && activeSection.value === 'performance',
  { historyDataSource },
)
const metrics = useFundMetrics(historyDataSource, benchmarkDataSource)
const holdings = useFundHoldings(() => detail.visible.value && activeSection.value === 'holdings')
const snapshot = computed(() => {
  const code = detail.currentCode.value
  return code ? store.snapshotsByCode[code] : undefined
})
const viewModel = computed(() => {
  const currentSnapshot = snapshot.value
  return currentSnapshot
    ? toFundDetailViewModel(currentSnapshot, detail.basicInfo.value)
    : undefined
})
const drawerSize = computed(() => (isSmUp.value ? '90dvh' : '100dvh'))

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
    :error="detail.error.value"
    :is-loading="detail.isLoading.value"
    :size="drawerSize"
    :view-model="viewModel"
    :visible="detail.visible.value"
    @close="close"
    @edit="edit"
    @retry="detail.retry"
    @select-section="activeSection = $event"
  >
    <template #performance>
      <FundPerformanceSection
        :key="detail.currentCode.value"
        :model="performance.model.value"
        @activate-distribution="performance.activateDistribution"
        @retry="performance.retry"
        @retry-distribution="performance.retryDistribution"
        @select-range="performance.selectRange"
        @select-reference-index="performance.selectReferenceIndex"
        @select-view="performance.selectView"
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
