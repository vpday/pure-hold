<script setup lang="ts">
import { computed, ref } from 'vue'

import type { FundRowViewModel, FundSort, FundSortField } from '../models/fundListViewModel'
import FundQuoteCard from './FundQuoteCard.vue'

interface SortOption {
  readonly label: string
  readonly value: FundSortField
}

const props = defineProps<{
  holdingMode: boolean
  rows: readonly FundRowViewModel[]
  sort: FundSort | null
}>()
const emit = defineEmits<{
  comingSoon: []
  delete: [code: string]
  detail: [code: string]
  edit: [code: string]
  sortChange: [sort: FundSort | null]
}>()
const sortDrawerVisible = ref(false)
const draftSortField = ref<FundSortField>()
const draftDescending = ref(true)

const baseSortFieldGroups: readonly {
  readonly label: string
  readonly options: readonly SortOption[]
}[] = [
  {
    label: '行情涨跌幅',
    options: [
      { label: '净值估算涨跌幅', value: 'estimatedChangePercent' },
      { label: '单位净值涨跌幅', value: 'dailyChangePercent' },
    ],
  },
  {
    label: '区间收益',
    options: [
      { label: '近1周', value: 'oneWeek' },
      { label: '近1月', value: 'oneMonth' },
      { label: '近3月', value: 'threeMonths' },
      { label: '近6月', value: 'sixMonths' },
      { label: '今年以来', value: 'yearToDate' },
      { label: '近1年', value: 'oneYear' },
      { label: '近2年', value: 'twoYears' },
      { label: '近3年', value: 'threeYears' },
      { label: '近5年', value: 'fiveYears' },
      { label: '成立以来', value: 'sinceInception' },
    ],
  },
]
const sortFieldGroups = computed(() => [
  ...(props.holdingMode
    ? [
        {
          label: '持仓收益',
          options: [
            { label: '估算收益', value: 'estimatedIncomePercent' as const },
            { label: '今日收益', value: 'todayIncomePercent' as const },
            { label: '昨日收益', value: 'yesterdayIncomePercent' as const },
            { label: '持仓收益', value: 'holdingIncomePercent' as const },
          ],
        },
        {
          label: '持仓数据',
          options: [
            { label: '持仓金额', value: 'holdingAmount' as const },
            { label: '持有天数', value: 'holdingDays' as const },
          ],
        },
      ]
    : []),
  ...baseSortFieldGroups,
])
const directionOptions = [
  { label: '从高到低', value: true },
  { label: '从低到高', value: false },
] as const

function openSortDrawer(): void {
  draftSortField.value = props.sort?.sortBy
  draftDescending.value = props.sort?.descending ?? true
  sortDrawerVisible.value = true
}

function confirmSort(): void {
  if (!draftSortField.value) return
  emit('sortChange', {
    descending: draftDescending.value,
    sortBy: draftSortField.value,
  })
  sortDrawerVisible.value = false
}

function resetSort(): void {
  emit('sortChange', null)
  sortDrawerVisible.value = false
}

defineExpose({ openSortDrawer })
</script>

<template>
  <div class="mt-3 flex flex-col gap-3">
    <FundQuoteCard
      v-for="row in rows"
      :key="`${row.code}:${row.holding?.currentIncome.source ?? 'quote'}`"
      :holding-mode="holdingMode"
      :row="row"
      @coming-soon="emit('comingSoon')"
      @delete="emit('delete', $event)"
      @detail="emit('detail', $event)"
      @edit="emit('edit', $event)"
    />

    <t-drawer
      v-model:visible="sortDrawerVisible"
      attach="body"
      :destroy-on-close="true"
      header="排序"
      placement="bottom"
      size="100dvh"
    >
      <div class="mobile-sort-content">
        <section class="mobile-sort-section" aria-labelledby="mobile-sort-direction-title">
          <div class="mobile-sort-section-heading">
            <h3 id="mobile-sort-direction-title" class="text-base font-medium">排序方向</h3>
            <span class="text-xs text-(--td-text-color-secondary)">选择数据排列顺序</span>
          </div>
          <t-radio-group
            v-model="draftDescending"
            class="mobile-sort-direction"
            :options="directionOptions"
            theme="button"
            variant="default-filled"
          />
        </section>

        <section class="mobile-sort-section" aria-labelledby="mobile-sort-field-title">
          <div class="mobile-sort-section-heading">
            <h3 id="mobile-sort-field-title" class="text-base font-medium">排序指标</h3>
            <span class="text-xs text-(--td-text-color-secondary)">选择一项作为排序依据</span>
          </div>

          <div class="mobile-sort-groups">
            <div v-for="group in sortFieldGroups" :key="group.label" class="mobile-sort-group">
              <p class="text-sm text-(--td-text-color-secondary)">{{ group.label }}</p>
              <t-radio-group
                v-model="draftSortField"
                class="mobile-sort-options"
                :class="group.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'"
                :options="group.options"
                theme="button"
                variant="default-filled"
              />
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="mobile-sort-footer">
          <t-button :disabled="!sort && !draftSortField" variant="text" @click="resetSort">
            恢复默认
          </t-button>
          <div class="flex gap-2">
            <t-button variant="outline" @click="sortDrawerVisible = false">取消</t-button>
            <t-button :disabled="!draftSortField" theme="primary" @click="confirmSort">
              确定
            </t-button>
          </div>
        </div>
      </template>
    </t-drawer>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.mobile-sort-content {
  @apply flex min-h-0 flex-col gap-4 overflow-y-auto;
}

.mobile-sort-section {
  @apply flex flex-col gap-2;
}

.mobile-sort-section-heading {
  @apply flex items-baseline justify-between gap-2;
}

.mobile-sort-groups {
  @apply flex w-full flex-col gap-2;
}

.mobile-sort-group {
  @apply flex flex-col gap-2;
}

.mobile-sort-options {
  @apply grid w-full gap-2;
}

.mobile-sort-footer {
  @apply flex items-center justify-between gap-2 pb-[env(safe-area-inset-bottom)];
}

.mobile-sort-direction {
  @apply grid w-full grid-cols-2;
}
</style>
