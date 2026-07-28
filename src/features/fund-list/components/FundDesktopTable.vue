<script setup lang="ts">
import { computed, h, ref } from 'vue'
import type { DropdownProps, PrimaryTableProps } from 'tdesign-vue-next'

import type {
  FundReturnField,
  FundRowViewModel,
  FundSort,
  FundSortField,
  FundTrend,
} from '../models/fundListViewModel'
import { fundTagTheme, isEstimatedQuoteEmpty } from '../presenters/fundDisplayRules'

const props = defineProps<{
  estimatedAt: string
  loading: boolean
  navDate: string
  rows: readonly FundRowViewModel[]
  sort: FundSort | null
}>()
const emit = defineEmits<{
  comingSoon: []
  delete: [code: string]
  edit: [code: string]
  sortChange: [sort: FundSort | null]
}>()
const pendingDeleteCode = ref<string>()

const returnColumns: readonly { cell: string; colKey: FundReturnField; title: string }[] = [
  { cell: 'one-week-cell', colKey: 'oneWeek', title: '近1周' },
  { cell: 'one-month-cell', colKey: 'oneMonth', title: '近1月' },
  { cell: 'three-months-cell', colKey: 'threeMonths', title: '近3月' },
  { cell: 'six-months-cell', colKey: 'sixMonths', title: '近6月' },
  { cell: 'year-to-date-cell', colKey: 'yearToDate', title: '今年以来' },
  { cell: 'one-year-cell', colKey: 'oneYear', title: '近1年' },
  { cell: 'two-years-cell', colKey: 'twoYears', title: '近2年' },
  { cell: 'three-years-cell', colKey: 'threeYears', title: '近3年' },
  { cell: 'five-years-cell', colKey: 'fiveYears', title: '近5年' },
  { cell: 'since-inception-cell', colKey: 'sinceInception', title: '成立以来' },
]
const columns = computed<PrimaryTableProps<FundRowViewModel>['columns']>(() => {
  const estimatedAt = props.estimatedAt
  const navDate = props.navDate

  return [
    { cell: 'name-cell', colKey: 'name', title: '基金名称', fixed: 'left', width: 180 },
    {
      cell: 'estimated-nav-cell',
      colKey: 'estimatedNav',
      sorter: true,
      title: () => renderQuoteTitle('净值估算', estimatedAt),
    },
    {
      cell: 'nav-cell',
      colKey: 'nav',
      sorter: true,
      title: () => renderQuoteTitle('单位净值', navDate),
    },
    ...returnColumns.map((column) => ({ ...column, sorter: true })),
    { cell: 'actions-cell', colKey: 'actions', title: '操作', fixed: 'right', width: 98 },
  ]
})
const moreActionOptions = [
  { content: '编辑', value: 'edit' },
  { content: '删除', theme: 'error', value: 'delete' },
  { content: '记录买入', value: 'buy' },
  { content: '记录卖出', value: 'sell' },
] satisfies NonNullable<DropdownProps['options']>

function handleSortChange(value: unknown): void {
  if (!isTableSort(value)) {
    emit('sortChange', null)
    return
  }
  emit('sortChange', {
    descending: value.descending,
    sortBy: value.sortBy as FundSortField,
  })
}

function isTableSort(
  value: unknown,
): value is { readonly descending: boolean; readonly sortBy: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'sortBy' in value &&
    typeof value.sortBy === 'string' &&
    'descending' in value &&
    typeof value.descending === 'boolean'
  )
}

function trendClass(trend: FundTrend): string {
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  return 'text-(--td-text-color-primary)'
}

function renderQuoteTitle(label: string, date: string) {
  return h('div', [label, h('p', { class: 'font-mono text-xs font-normal tabular-nums' }, date)])
}

function handleMoreAction(code: string, value: unknown): void {
  if (value === 'edit') {
    emit('edit', code)
    return
  }
  if (value === 'delete') {
    pendingDeleteCode.value = code
    return
  }
  emit('comingSoon')
}

function confirmDelete(code: string): void {
  pendingDeleteCode.value = undefined
  emit('delete', code)
}

function handleDeleteConfirmVisibleChange(code: string, visible: boolean): void {
  if (!visible && pendingDeleteCode.value === code) {
    pendingDeleteCode.value = undefined
  }
}

function shouldShowRowDate(rowDate: string, headerDate: string): boolean {
  const formatted = formatRowDate(rowDate, headerDate)
  return formatted !== '--' && formatted !== headerDate
}

function formatRowDate(rowDate: string, headerDate: string): string {
  if (rowDate === '--') {
    return rowDate
  }
  const match = /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(rowDate)
  if (!match?.[2] || !match[3]) {
    return rowDate
  }
  if (/^\d{2}:\d{2}$/.test(headerDate) && match[4] && match[5]) {
    return `${match[4]}:${match[5]}`
  }
  if (/^\d{2}-\d{2} \d{2}:\d{2}$/.test(headerDate) && match[4] && match[5]) {
    return `${match[2]}-${match[3]} ${match[4]}:${match[5]}`
  }
  if (/^\d{2}-\d{2}$/.test(headerDate)) {
    return `${match[2]}-${match[3]}`
  }
  return rowDate
}
</script>

<template>
  <t-primary-table
    :key="`${estimatedAt}:${navDate}`"
    :columns="columns"
    :data="rows"
    :loading="loading"
    :sort="sort ?? undefined"
    size="small"
    :header-affixed-top="true"
    :horizontal-scroll-affixed-bottom="true"
    row-key="code"
    table-layout="auto"
    :table-content-width="'1380px'"
    @sort-change="handleSortChange"
  >
    <template #name-cell="{ row }">
      <div>
        <p class="whitespace-normal">{{ row.name }}</p>
        <div class="fund-code-tags">
          <p class="font-mono tabular-nums text-(--td-text-color-secondary)">
            {{ row.code }}
          </p>
          <t-tag
            v-for="tag in row.tags"
            :key="tag"
            class="shrink-0"
            size="small"
            :theme="fundTagTheme(tag)"
            variant="light"
          >
            {{ tag }}
          </t-tag>
        </div>
      </div>
    </template>
    <template #estimated-nav-cell="{ row }">
      <div class="font-mono tabular-nums">
        <p v-if="isEstimatedQuoteEmpty(row)">--</p>
        <template v-else>
          <p>{{ row.estimatedNavText }}</p>
          <p :class="trendClass(row.trendByField.estimatedChangePercent)">
            {{ row.estimatedChangePercentText }}
          </p>
          <p
            v-if="shouldShowRowDate(row.estimatedAtText, estimatedAt)"
            class="text-xs text-(--td-text-color-placeholder)"
          >
            {{ formatRowDate(row.estimatedAtText, estimatedAt) }}
          </p>
        </template>
      </div>
    </template>
    <template #nav-cell="{ row }">
      <div class="font-mono tabular-nums">
        <p>{{ row.navText }}</p>
        <p :class="trendClass(row.trendByField.dailyChangePercent)">
          {{ row.dailyChangePercentText }}
        </p>
        <p
          v-if="shouldShowRowDate(row.navDateText, navDate)"
          class="text-xs text-(--td-text-color-placeholder)"
        >
          {{ formatRowDate(row.navDateText, navDate) }}
        </p>
      </div>
    </template>
    <template v-for="column in returnColumns" :key="column.colKey" #[column.cell]="{ row }">
      <span class="font-mono tabular-nums" :class="trendClass(row.trendByField[column.colKey])">
        {{ row.returns[column.colKey] }}
      </span>
    </template>
    <template #actions-cell="{ row }">
      <div>
        <t-popconfirm
          cancel-btn="取消"
          :confirm-btn="{ content: '删除', theme: 'danger' }"
          theme="danger"
          :visible="pendingDeleteCode === row.code"
          @confirm="confirmDelete(row.code)"
          @visible-change="handleDeleteConfirmVisibleChange(row.code, $event)"
        >
          <template #content>
            <p class="max-w-64 whitespace-normal wrap-break-word">
              确认删除“{{ row.name }}”（{{ row.code }}）？<br />
              将从整个基金列表及所有分组中删除。
            </p>
          </template>
          <t-dropdown
            :options="moreActionOptions"
            trigger="hover"
            @click="handleMoreAction(row.code, $event.value)"
          >
            <t-button size="small" variant="text">更多... </t-button>
          </t-dropdown>
        </t-popconfirm>
      </div>
    </template>
  </t-primary-table>
</template>

<style scoped>
@reference '@/style.css';

.fund-code-tags {
  @apply mt-1 flex max-w-35 gap-1 overflow-x-auto scrollbar-thumb-transparent
  hover:scrollbar-thumb-current;
}
</style>
