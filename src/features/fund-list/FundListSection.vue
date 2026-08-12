<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { MessagePlugin } from 'tdesign-vue-next'

import { useAppSettingsStore } from '@/app/settings/stores/useAppSettingsStore'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import FundEditEntry from '@/features/fund-edit/FundEditEntry.vue'
import FundDetailEntry from '@/features/fund-detail/FundDetailEntry.vue'
import FundGroupSettingsEntry from '@/features/fund-group-settings/FundGroupSettingsEntry.vue'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import FundDesktopTable from './components/FundDesktopTable.vue'
import FundEmptyState from './components/FundEmptyState.vue'
import FundMobileList from './components/FundMobileList.vue'
import { useFundListSession } from './composables/useFundListSession'

const emit = defineEmits<{ searchFunds: [] }>()
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
  const result = store.deleteFund(code)
  if (result.error) {
    MessagePlugin.error(result.error)
  }
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
          @coming-soon="showComingSoon"
          @delete="deleteFund"
          @detail="fundDetail?.open($event)"
          @edit="fundEdit?.open($event)"
          @sort-change="setSort"
        />
      </div>
      <div class="sm:hidden">
        <FundMobileList
          ref="mobileList"
          :holding-mode="model.holdingMode"
          :rows="model.rows"
          :sort="model.activeSort"
          @coming-soon="showComingSoon"
          @delete="deleteFund"
          @detail="fundDetail?.open($event)"
          @edit="fundEdit?.open($event)"
          @sort-change="setSort"
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
