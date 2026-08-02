<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import type { FundReinvestedNavIssueCode } from '@/domains/funds/models/fundReinvestedNav'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDetailDrawer from './components/FundDetailDrawer.vue'
import FundMetricsSection from './components/FundMetricsSection.vue'
import FundPerformanceSection from './components/FundPerformanceSection.vue'
import { useFundBenchmarkDataSource } from './composables/useFundBenchmarkDataSource'
import { useFundDetail } from './composables/useFundDetail'
import { useFundHistoryDataSource } from './composables/useFundHistoryDataSource'
import { useFundMetrics } from './composables/useFundMetrics'
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
const metricIssueLabels: Record<FundReinvestedNavIssueCode, string> = {
  'duplicate-conversion': '重复折算',
  'first-date-conversion': '首日折算',
  'first-date-dividend': '首日分红',
  'invalid-conversion': '无效折算',
  'invalid-dividend': '无效分红',
  'invalid-unit-net-value': '无效单位净值',
  'unmatched-conversion-date': '无法对齐的折算',
  'unmatched-dividend-date': '无法对齐的分红',
}
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
  void detail.open(code)
}

function close(): void {
  detail.close()
  performance.close()
  metrics.close()
}

async function refresh(): Promise<void> {
  await Promise.all([detail.refresh(), performance.refresh(), metrics.refresh()])
  showMetricsWarning()
}

async function activateMetrics(): Promise<void> {
  await metrics.activate()
  showMetricsWarning()
}

async function retryMetrics(): Promise<void> {
  await metrics.retry()
  showMetricsWarning()
}

function showMetricsWarning(): void {
  for (let notice = metrics.takeNotice(); notice; notice = metrics.takeNotice()) {
    if (notice.kind === 'cached-refresh-failed') {
      void MessagePlugin.warning('刷新失败，当前展示缓存数据')
      continue
    }
    if (notice.kind === 'benchmark-history-incomplete') {
      void MessagePlugin.warning('历史数据不完整')
      continue
    }
    const reasons = Object.entries(notice.counts)
      .filter((entry): entry is [FundReinvestedNavIssueCode, number] => entry[1] !== undefined)
      .map(([code, count]) => `${metricIssueLabels[code]} ${count} 条`)
      .join('、')
    void MessagePlugin.warning(
      `已忽略 ${notice.totalCount} 条异常记录（${reasons}），收益指标可能存在偏差`,
    )
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
        @retry="retryMetrics"
        @select-view="metrics.selectView"
      />
    </template>
  </FundDetailDrawer>
</template>
