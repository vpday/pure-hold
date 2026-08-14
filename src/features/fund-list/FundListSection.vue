<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { MessagePlugin } from 'tdesign-vue-next'

import {
  createPortfolioCoordinator,
  type FundDeletionPreview,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { useAppSettingsStore } from '@/app/settings/stores/useAppSettingsStore'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import type { PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import {
  ensurePlanInstallment,
  updatePlanInstallmentStatus,
} from '@/domains/portfolio/services/portfolioPlanService.ts'
import FundEditEntry from '@/features/fund-edit/FundEditEntry.vue'
import FundDetailEntry from '@/features/fund-detail/FundDetailEntry.vue'
import FundPlanEntry from '@/features/fund-plan/FundPlanEntry.vue'
import FundTransactionEntry, {
  type BuyTransactionOpenOptions,
} from '@/features/fund-transaction/FundTransactionEntry.vue'
import FundGroupSettingsEntry from '@/features/fund-group-settings/FundGroupSettingsEntry.vue'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDesktopTable from './components/FundDesktopTable.vue'
import FundEmptyState from './components/FundEmptyState.vue'
import FundMobileList from './components/FundMobileList.vue'
import { useFundListSession } from './composables/useFundListSession'
import type {
  PlanExecutionRequest,
  PlanInstallmentActionRequest,
} from '@/features/fund-plan/presenters/toPortfolioPlanViewModel.ts'

const emit = defineEmits<{ searchFunds: [] }>()
const props = defineProps<{ portfolio: PortfolioStore }>()
const store = useFundsStore()
const appSettingsStore = useAppSettingsStore()
const {
  fundOrder,
  groups,
  holdingOrder,
  holdingsByCode,
  isRefreshing,
  lastRefreshIssues,
  previousSnapshotsByCode,
  snapshotsByCode,
} = storeToRefs(store)
const { preferences } = storeToRefs(appSettingsStore)
const groupSettings = ref<{ open: () => void }>()
const mobileList = ref<{ openSortDrawer: () => void }>()
const fundEdit = ref<{ open: (code: string) => void }>()
const fundPlan = ref<{ open: (code: string, name: string) => void }>()
const fundDetail = ref<{ open: (code: string) => void }>()
const fundTransaction = ref<{
  open: (code: string, name: string, options?: BuyTransactionOpenOptions) => void
  openSell: (code: string, name: string) => void
}>()
const deletionPreview = ref<FundDeletionPreview>()
const deletionVisible = ref(false)
const deletionError = ref('')
const portfolioCoordinator = createPortfolioCoordinator({
  funds: {
    deleteFund: store.deleteFund,
    getSettingsSnapshot: store.getSettingsSnapshot,
  },
  portfolio: props.portfolio,
})
const { clearCategorySorts, model, selectCategory, setSort } = useFundListSession({
  fundOrder,
  groups,
  holdingOrder,
  holdingsByCode,
  lastRefreshIssues,
  previousSnapshotsByCode,
  snapshotsByCode,
})

const refreshObserver = () => store.refreshAll({ force: true })
let unsubscribeRefresh: (() => void) | undefined
onMounted(() => {
  applyPollingConfiguration()
  void store.refreshAll()
  store.startPolling()
  unsubscribeRefresh = subscribeGlobalRefresh(refreshObserver)
})
onBeforeUnmount(() => {
  store.stopPolling()
  unsubscribeRefresh?.()
})

watch(
  preferences,
  () => {
    applyPollingConfiguration()
  },
  { deep: true },
)

function applyPollingConfiguration(): void {
  store.setPollingConfiguration({
    enabled: preferences.value.funds.enabled,
    intervalMs: preferences.value.funds.intervalMinutes * 60_000,
  })
}

watch(isRefreshing, (refreshing, wasRefreshing) => {
  if (refreshing || !wasRefreshing) return
  for (const notice of model.value.refreshNotices) {
    if (notice.level === 'warning') MessagePlugin.warning(notice.message)
    else MessagePlugin.error(notice.message)
  }
})

function clearSavedCategorySorts(categoryIds: readonly string[]): void {
  clearCategorySorts(categoryIds)
}

function showComingSoon(): void {
  MessagePlugin.info('功能开发中')
}

function enableLedger(code: string): boolean {
  const result = portfolioCoordinator.enableFund({
    fundCode: code,
    holding: holdingsByCode.value[code],
  })
  if (!result.ok) {
    const message =
      result.reason === 'portfolio-persistence-failed'
        ? '投资账本保存失败，启用未完成。'
        : result.reason === 'invalid-holding'
          ? '当前持仓无效，无法启用账本。'
          : '基金不存在，无法启用账本。'
    MessagePlugin.error(message)
    return false
  }
  MessagePlugin.success('已启用投资账本')
  return true
}

function deleteFund(code: string): void {
  const result = portfolioCoordinator.prepareFundDeletion(code)
  if (!result.ok) {
    MessagePlugin.error('基金不存在，无法删除')
    return
  }
  deletionError.value = ''
  deletionPreview.value = result.preview
  deletionVisible.value = true
}

function cancelFundDeletion(): void {
  deletionVisible.value = false
  deletionPreview.value = undefined
  deletionError.value = ''
}

function confirmFundDeletion(): void {
  const preview = deletionPreview.value
  if (!preview) return
  const result = portfolioCoordinator.confirmFundDeletion(preview)
  if (!result.ok) {
    deletionError.value = result.partialPersistence
      ? '删除失败，数据可能已部分持久化，请先检查账本和基金配置。'
      : result.reason === 'portfolio-persistence-failed'
        ? '投资账本保存失败，删除未完成。'
        : '基金配置保存失败，删除未完成。'
    MessagePlugin.error(deletionError.value)
    return
  }
  MessagePlugin.success('基金及其关联记录已删除')
  cancelFundDeletion()
}

function openBuy(code: string): void {
  const row = model.value.rows.find((candidate) => candidate.code === code)
  if (row) fundTransaction.value?.open(code, row.name)
}

function openSell(code: string): void {
  const row = model.value.rows.find((candidate) => candidate.code === code)
  if (row) fundTransaction.value?.openSell(code, row.name)
}

function openPlan(code: string): void {
  const row = model.value.rows.find((candidate) => candidate.code === code)
  if (row) fundPlan.value?.open(code, row.name)
}

function openPlanExecution(request: PlanExecutionRequest): void {
  const row = model.value.rows.find((candidate) => candidate.code === request.fundCode)
  if (!row) return
  const portfolio = props.portfolio.getPortfolio()
  const plan = portfolio.plans.find(({ id }) => id === request.planId)
  if (!plan) {
    MessagePlugin.error('定投计划不存在')
    return
  }
  const ensured = ensurePlanInstallment(
    props.portfolio,
    plan,
    request.plannedDate,
    new Date().toISOString(),
  )
  if (!ensured.ok) {
    MessagePlugin.error('定投期次保存失败')
    return
  }
  const event = props.portfolio
    .getPortfolio()
    .events.find(
      (candidate) =>
        candidate.kind === 'buy' &&
        candidate.planId === request.planId &&
        candidate.installmentId === ensured.installment.id,
    )
  fundTransaction.value?.open(row.code, row.name, {
    existingEvent: event?.kind === 'buy' ? event : undefined,
    installment: ensured.installment,
    plan,
    plannedDate: request.plannedDate,
  })
}

function updatePlanInstallment(
  request: PlanInstallmentActionRequest,
  status: 'cancelled' | 'skipped',
): void {
  const result = updatePlanInstallmentStatus(
    props.portfolio,
    request.installmentId,
    status,
    new Date().toISOString(),
  )
  if (!result.ok) {
    MessagePlugin.error('定投期次状态保存失败')
    return
  }
  MessagePlugin.success(status === 'skipped' ? '本期定投已跳过' : '本期定投已取消')
}
</script>

<template>
  <section aria-label="自选基金" class="bg-(--td-bg-color-container) mt-4 p-4">
    <t-tabs
      :value="model.activeCategory.id"
      :list="model.categoryTabs"
      aria-label="基金分类"
      class="mb-4 min-w-0"
      @update:value="selectCategory(String($event))"
    >
      <template #action>
        <div class="flex items-center">
          <span v-if="model.rows.length" class="flex sm:hidden">
            <t-button
              :aria-label="model.activeSort ? '调整基金排序' : '设置基金排序'"
              shape="square"
              size="medium"
              :theme="model.activeSort ? 'primary' : 'default'"
              variant="text"
              @click="mobileList?.openSortDrawer()"
            >
              <template #icon>
                <t-icon
                  :name="
                    model.activeSort
                      ? model.activeSort.descending
                        ? 'order-descending'
                        : 'order-ascending'
                      : 'filter-sort'
                  "
                />
              </template>
            </t-button>
          </span>
          <span class="flex sm:hidden">
            <t-button
              aria-label="分组管理"
              shape="square"
              size="medium"
              variant="text"
              @click="groupSettings?.open()"
            >
              <template #icon><t-icon name="folder-setting" /></template>
            </t-button>
          </span>
          <span class="hidden sm:flex">
            <t-button variant="text" size="medium" @click="groupSettings?.open()">
              <template #icon><t-icon name="folder-setting" /></template>
              分组管理
            </t-button>
          </span>
        </div>
      </template>
    </t-tabs>

    <FundEmptyState
      v-if="model.rows.length === 0"
      :is-all-category="model.activeCategory.id === 'all'"
      @coming-soon="showComingSoon"
      @search="emit('searchFunds')"
    />
    <template v-else>
      <div class="hidden sm:block">
        <FundDesktopTable
          :estimated-at="model.latestEstimatedAt"
          :holding-mode="model.holdingMode"
          :loading="isRefreshing"
          :nav-date="model.latestNavDate"
          :rows="model.rows"
          :sort="model.activeSort"
          @buy="openBuy"
          @coming-soon="showComingSoon"
          @delete="deleteFund"
          @detail="fundDetail?.open($event)"
          @edit="fundEdit?.open($event)"
          @plan="openPlan"
          @sell="openSell"
          @sort-change="setSort"
        />
      </div>
      <div class="sm:hidden">
        <FundMobileList
          ref="mobileList"
          :holding-mode="model.holdingMode"
          :rows="model.rows"
          :sort="model.activeSort"
          @buy="openBuy"
          @coming-soon="showComingSoon"
          @delete="deleteFund"
          @detail="fundDetail?.open($event)"
          @edit="fundEdit?.open($event)"
          @plan="openPlan"
          @sell="openSell"
          @sort-change="setSort"
        />
      </div>
    </template>

    <FundGroupSettingsEntry ref="groupSettings" @saved="clearSavedCategorySorts" />
    <FundDetailEntry
      ref="fundDetail"
      :enable-ledger="enableLedger"
      :portfolio="props.portfolio"
      @edit="fundEdit?.open($event)"
      @execute-plan="openPlanExecution"
      @skip-plan="updatePlanInstallment($event, 'skipped')"
      @cancel-plan="updatePlanInstallment($event, 'cancelled')"
    />
    <FundEditEntry ref="fundEdit" />
    <FundPlanEntry ref="fundPlan" :portfolio="props.portfolio" />
    <FundTransactionEntry ref="fundTransaction" :portfolio="props.portfolio" />

    <t-dialog
      v-if="deletionPreview"
      v-model:visible="deletionVisible"
      attach="body"
      :cancel-btn="{ content: '取消', variant: 'outline' }"
      :close-on-esc-keydown="false"
      :close-on-overlay-click="false"
      :confirm-btn="{ content: '确认删除', theme: 'danger' }"
      :dialog-style="{ maxWidth: 'calc(100vw - 32px)' }"
      header="确认删除基金"
      placement="center"
      width="min(480px, calc(100vw - 32px))"
      @cancel="cancelFundDeletion"
      @close="cancelFundDeletion"
      @confirm="confirmFundDeletion"
    >
      <div class="space-y-4">
        <p>
          将删除基金 <strong>{{ deletionPreview.fundName }}</strong
          >（{{ deletionPreview.fundCode }}）及其账本关联。
        </p>
        <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
          <dt>交易事件总数</dt>
          <dd class="font-mono tabular-nums">{{ deletionPreview.stats.eventCount }}</dd>
          <dt>分红事件（现金 / 再投资）</dt>
          <dd class="font-mono tabular-nums">
            {{ deletionPreview.stats.cashDividendCount }} /
            {{ deletionPreview.stats.dividendReinvestmentCount }}
          </dd>
          <dt>修正事件</dt>
          <dd class="font-mono tabular-nums">{{ deletionPreview.stats.adjustmentCount }}</dd>
          <dt>定投计划</dt>
          <dd class="font-mono tabular-nums">{{ deletionPreview.stats.planCount }}</dd>
          <dt>定投期次</dt>
          <dd class="font-mono tabular-nums">{{ deletionPreview.stats.installmentCount }}</dd>
        </dl>
        <p class="text-sm text-(--td-warning-color)">
          删除后不可恢复，包含交易、分红、修正、定投计划和期次。建议先导出配置 JSON。
        </p>
        <p v-if="deletionError" class="text-sm text-(--td-error-color)">
          {{ deletionError }}
        </p>
      </div>
    </t-dialog>
  </section>
</template>

<style scoped>
:deep(.t-tabs__operations) {
  border-bottom: 0;
}
</style>
