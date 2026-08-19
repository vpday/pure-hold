<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { MessagePlugin } from 'tdesign-vue-next'

import type {
  FundDeletionPreview,
  PortfolioCoordinationStatus,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { useAppSettingsStore } from '@/app/settings/stores/useAppSettingsStore'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import type { PortfolioBuyEvent, PortfolioSellEvent } from '@/domains/portfolio/models/index.ts'
import type { PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import FundEditEntry from '@/features/fund-edit/FundEditEntry.vue'
import FundDetailEntry from '@/features/fund-detail/FundDetailEntry.vue'
import FundTransactionEntry from '@/features/fund-transaction/FundTransactionEntry.vue'
import FundGroupSettingsEntry from '@/features/fund-group-settings/FundGroupSettingsEntry.vue'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDesktopTable from './components/FundDesktopTable.vue'
import FundEmptyState from './components/FundEmptyState.vue'
import FundMobileList from './components/FundMobileList.vue'
import { useFundListSession } from './composables/useFundListSession'

const emit = defineEmits<{ searchFunds: [] }>()
const props = defineProps<{
  portfolio: PortfolioStore
  portfolioCoordinator: PortfolioCoordinator
}>()
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
const fundDetail = ref<{ open: (code: string) => void }>()
const fundTransaction = ref<{
  open: (code: string, name: string) => void
  openEdit: (event: TransactionEvent, name: string) => void
  openSell: (code: string, name: string) => void
}>()
const portfolioRevision = ref(0)
const deletionPreview = ref<FundDeletionPreview>()
const deletionVisible = ref(false)
const deletionError = ref('')
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

function deleteFund(code: string): void {
  const result = props.portfolioCoordinator.prepareFundDeletion(code)
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
  const result = props.portfolioCoordinator.confirmFundDeletion(preview)
  if (!result.ok) {
    deletionError.value =
      result.failure.persistence === 'partial'
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

type TransactionEvent = PortfolioBuyEvent | PortfolioSellEvent

function findTransaction(eventId: string): TransactionEvent | undefined {
  const event = props.portfolio.getPortfolio().events.find(({ id }) => id === eventId)
  return event?.kind === 'buy' || event?.kind === 'sell' ? event : undefined
}

function handleTransactionSaved(): void {
  portfolioRevision.value += 1
}

function editTransaction(eventId: string): void {
  const event = findTransaction(eventId)
  if (event === undefined) {
    MessagePlugin.error('交易记录不存在，无法编辑')
    return
  }
  const row = model.value.rows.find((candidate) => candidate.code === event.fundCode)
  fundTransaction.value?.openEdit(event, row?.name ?? event.fundCode)
}

function deleteTransaction(eventId: string): void {
  const event = findTransaction(eventId)
  if (event === undefined) {
    MessagePlugin.error('交易记录不存在，无法删除')
    return
  }
  const result = props.portfolioCoordinator.deleteEvent({
    eventId,
    fundCode: event.fundCode,
  })
  if (isBlockingCoordinationStatus(result.status)) {
    MessagePlugin.error(
      result.failure?.persistence === 'partial'
        ? '交易记录删除失败，数据可能已部分持久化，请重试并检查账本。'
        : '交易记录删除失败，账本未改变。',
    )
    return
  }
  portfolioRevision.value += 1
  if (result.status === 'synced') MessagePlugin.success('交易记录已删除')
  else MessagePlugin.warning('交易记录已删除，但持仓同步待重试')
}

function isBlockingCoordinationStatus(status: PortfolioCoordinationStatus): boolean {
  return (
    status === 'ledger-error' ||
    status === 'portfolio-persistence-failed' ||
    status === 'holding-sync-failed'
  )
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
          @sell="openSell"
          @sort-change="setSort"
        />
      </div>
    </template>

    <FundGroupSettingsEntry ref="groupSettings" @saved="clearSavedCategorySorts" />
    <FundDetailEntry
      ref="fundDetail"
      :portfolio-coordinator="props.portfolioCoordinator"
      :portfolio-revision="portfolioRevision"
      @delete-transaction="deleteTransaction"
      @edit="fundEdit?.open($event)"
      @edit-transaction="editTransaction"
      @record-buy="openBuy"
      @record-sell="openSell"
    />
    <FundEditEntry ref="fundEdit" :portfolio-coordinator="props.portfolioCoordinator" />
    <FundTransactionEntry
      ref="fundTransaction"
      :portfolio-coordinator="props.portfolioCoordinator"
      @saved="handleTransactionSaved"
    />

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
        </dl>
        <p class="text-sm text-(--td-warning-color)">
          删除后不可恢复，包含交易、分红和修正。建议先导出配置 JSON。
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
