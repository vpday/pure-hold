<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import FundEditEntry from '@/features/fund-edit/FundEditEntry.vue'
import FundDetailEntry from '@/features/fund-detail/FundDetailEntry.vue'
import FundGroupSettingsEntry from '@/features/fund-group-settings/FundGroupSettingsEntry.vue'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDesktopTable from './components/FundDesktopTable.vue'
import FundEmptyState from './components/FundEmptyState.vue'
import FundMobileList from './components/FundMobileList.vue'
import type { FundSort } from './models/fundListViewModel'
import { buildFundCategories } from './presenters/buildFundCategories'
import { clearFundCategorySorts } from './presenters/clearFundCategorySorts'
import { formatEstimatedDisplayDate, formatNavDisplayDate } from './presenters/formatFundDates'
import { sortFundSnapshots } from './presenters/sortFundSnapshots'
import { toFundListViewModel } from './presenters/toFundListViewModel'

const emit = defineEmits<{ searchFunds: [] }>()
const store = useFundsStore()
const { fundOrder, groups, holdingOrder, isRefreshing, lastRefreshIssues, snapshotsByCode } =
  storeToRefs(store)
const activeCategoryId = ref('all')
const sortByCategory = ref<Record<string, FundSort | null>>({})
const groupSettings = ref<{ open: () => void }>()
const fundEdit = ref<{ open: (code: string) => void }>()
const fundDetail = ref<{ open: (code: string) => void }>()
const categories = computed(() =>
  buildFundCategories(fundOrder.value, holdingOrder.value, groups.value),
)
const categoryTabs = computed(() =>
  categories.value.map((category) => ({
    label: `${category.name}（${category.fundCodes.length}）`,
    value: category.id,
  })),
)
const activeCategory = computed(
  () =>
    categories.value.find((category) => category.id === activeCategoryId.value) ??
    categories.value[0]!,
)
const activeSort = computed(() => sortByCategory.value[activeCategory.value.id] ?? null)
const orderedSnapshots = computed(() =>
  activeCategory.value.fundCodes.flatMap((code) => {
    const snapshot = snapshotsByCode.value[code]
    return snapshot ? [snapshot] : []
  }),
)
const rows = computed(() =>
  sortFundSnapshots(orderedSnapshots.value, activeSort.value).map(toFundListViewModel),
)
const latestEstimatedAt = computed(() =>
  formatEstimatedDisplayDate(latestText(rows.value.map((row) => row.estimatedAtText))),
)
const latestNavDate = computed(() =>
  formatNavDisplayDate(latestText(rows.value.map((row) => row.navDateText))),
)

const refreshObserver = () => store.refreshAll()
let unsubscribeRefresh: (() => void) | undefined
onMounted(() => {
  unsubscribeRefresh = subscribeGlobalRefresh(refreshObserver)
  void store.refreshAll()
})
onBeforeUnmount(() => unsubscribeRefresh?.())

watch(categories, (nextCategories) => {
  if (!nextCategories.some((category) => category.id === activeCategoryId.value)) {
    activeCategoryId.value = 'all'
  }
})

watch(isRefreshing, (refreshing, wasRefreshing) => {
  if (refreshing || !wasRefreshing) return
  if (lastRefreshIssues.value.some((issue) => issue.code === 'persistence-failed')) {
    MessagePlugin.warning('刷新成功，但未能保存；刷新页面后可能恢复旧数据')
    return
  }
  if (lastRefreshIssues.value.length > 0) {
    const hasFreshData = rows.value.some(
      (row) => snapshotsByCode.value[row.code]?.fetchedAt !== null,
    )
    MessagePlugin.error(hasFreshData ? '部分基金刷新失败' : '基金刷新失败，请稍后重试')
  }
})

function setSort(sort: FundSort | null): void {
  sortByCategory.value = { ...sortByCategory.value, [activeCategory.value.id]: sort }
}

function clearSavedCategorySorts(categoryIds: readonly string[]): void {
  sortByCategory.value = clearFundCategorySorts(sortByCategory.value, categoryIds)
}

function showComingSoon(): void {
  MessagePlugin.info('功能开发中')
}

function deleteFund(code: string): void {
  const result = store.deleteFund(code)
  if (result.error) {
    MessagePlugin.error(result.error)
  }
}

function latestText(values: readonly string[]): string {
  const available = values.filter((value) => value !== '--')
  return available.sort().at(-1) ?? '--'
}
</script>

<template>
  <section aria-label="自选基金" class="bg-(--td-bg-color-container) mt-4 p-4">
    <t-tabs
      v-model:value="activeCategoryId"
      :list="categoryTabs"
      aria-label="基金分类"
      class="mb-4 min-w-0"
    >
      <template #action>
        <t-button variant="text" size="medium" @click="groupSettings?.open()">
          <template #icon><t-icon name="folder-setting" /></template>
          分组管理
        </t-button>
      </template>
    </t-tabs>

    <FundEmptyState
      v-if="rows.length === 0"
      :is-all-category="activeCategory.id === 'all'"
      @coming-soon="showComingSoon"
      @search="emit('searchFunds')"
    />
    <template v-else>
      <div class="hidden sm:block">
        <FundDesktopTable
          :estimated-at="latestEstimatedAt"
          :loading="isRefreshing"
          :nav-date="latestNavDate"
          :rows="rows"
          :sort="activeSort"
          @coming-soon="showComingSoon"
          @delete="deleteFund"
          @detail="fundDetail?.open($event)"
          @edit="fundEdit?.open($event)"
          @sort-change="setSort"
        />
      </div>
      <div class="sm:hidden">
        <FundMobileList
          :rows="rows"
          @coming-soon="showComingSoon"
          @delete="deleteFund"
          @detail="fundDetail?.open($event)"
          @edit="fundEdit?.open($event)"
        />
      </div>
    </template>

    <FundGroupSettingsEntry ref="groupSettings" @saved="clearSavedCategorySorts" />
    <FundDetailEntry ref="fundDetail" @edit="fundEdit?.open($event)" />
    <FundEditEntry ref="fundEdit" />
  </section>
</template>

<style scoped>
:deep(.t-tabs__operations) {
  border-bottom: 0;
}
</style>
