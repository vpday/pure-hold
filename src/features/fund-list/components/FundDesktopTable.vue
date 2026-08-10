<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import type { DropdownProps, PrimaryTableProps, SortOptions } from 'tdesign-vue-next'

import { formatRowDate } from '@/shared/presenters/formatRowDate'
import type {
  FundReturnField,
  FundRowViewModel,
  FundSort,
  FundSortField,
  FundTrend,
} from '../models/fundListViewModel'
import { fundTagTheme, isEstimatedQuoteEmpty } from '../presenters/fundDisplayRules'
import {
  createFundRowComparator,
  moveMissingFundRowsLast,
  sortFundRows,
} from '../presenters/sortFundSnapshots'

const props = defineProps<{
  estimatedAt: string
  holdingMode: boolean
  loading: boolean
  navDate: string
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
const pendingDeleteCode = ref<string>()
const tableRows = ref<FundRowViewModel[]>([...props.rows])

watch(
  () => props.rows,
  (rows) => {
    tableRows.value = sortFundRows(rows, props.sort)
  },
)

watch(
  () => props.sort,
  (sort) => {
    if (!sort) tableRows.value = [...props.rows]
  },
)

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
  const nameColumn = {
    cell: 'name-cell',
    colKey: 'name',
    title: '基金名称',
    fixed: 'left' as const,
    width: 180,
  }
  const quoteColumns = [
    {
      cell: 'estimated-nav-cell',
      colKey: 'estimatedChangePercent',
      sorter: createFundRowComparator('estimatedChangePercent'),
      title: () => renderQuoteTitle('净值估算', estimatedAt),
    },
    {
      cell: 'nav-cell',
      colKey: 'dailyChangePercent',
      sorter: createFundRowComparator('dailyChangePercent'),
      title: () => renderQuoteTitle('单位净值', navDate),
    },
  ]
  const actionColumn = {
    cell: 'actions-cell',
    colKey: 'actions',
    fixed: 'right' as const,
    title: '操作',
  }

  if (props.holdingMode) {
    return [
      nameColumn,
      {
        cell: 'estimated-income-cell',
        colKey: 'estimatedIncomePercent',
        sorter: createFundRowComparator('estimatedIncomePercent'),
        title: () => renderQuoteTitle('估算收益', estimatedAt),
      },
      {
        cell: 'today-income-cell',
        colKey: 'todayIncomePercent',
        sorter: createFundRowComparator('todayIncomePercent'),
        title: () => renderQuoteTitle('今日收益', navDate),
      },
      {
        cell: 'yesterday-income-cell',
        colKey: 'yesterdayIncomePercent',
        sorter: createFundRowComparator('yesterdayIncomePercent'),
        title: () => renderQuoteTitle('昨日收益', navDate),
      },
      ...quoteColumns,
      {
        cell: 'holding-income-cell',
        colKey: 'holdingIncomePercent',
        sorter: createFundRowComparator('holdingIncomePercent'),
        title: '持仓收益',
      },
      {
        cell: 'holding-amount-cell',
        colKey: 'holdingAmount',
        sorter: createFundRowComparator('holdingAmount'),
        title: '持仓金额',
      },
      {
        cell: 'holding-days-cell',
        colKey: 'holdingDays',
        sorter: createFundRowComparator('holdingDays'),
        title: '持有天数',
      },
      ...returnColumns.map((column) => ({
        ...column,
        sorter: createFundRowComparator(column.colKey),
      })),
      actionColumn,
    ]
  }

  return [
    nameColumn,
    ...quoteColumns,
    ...returnColumns.map((column) => ({
      ...column,
      sorter: createFundRowComparator(column.colKey),
    })),
    actionColumn,
  ]
})
const moreActionOptions = [
  { content: '详情', value: 'detail' },
  { content: '编辑', value: 'edit' },
  { content: '删除', theme: 'error', value: 'delete' },
  { content: '记录买入', value: 'buy' },
  { content: '记录卖出', value: 'sell' },
] satisfies NonNullable<DropdownProps['options']>

function handleDataChange(rows: FundRowViewModel[]): void {
  tableRows.value = props.sort ? moveMissingFundRowsLast(rows, props.sort.sortBy) : rows
}

function handleSortChange(value: unknown, options: SortOptions<FundRowViewModel>): void {
  if (!isTableSort(value)) {
    tableRows.value = options.currentDataSource ?? tableRows.value
    emit('sortChange', null)
    return
  }
  const sort: FundSort = {
    descending: value.descending,
    sortBy: value.sortBy as FundSortField,
  }
  tableRows.value = moveMissingFundRowsLast(
    options.currentDataSource ?? tableRows.value,
    sort.sortBy,
  )
  emit('sortChange', sort)
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
  if (value === 'detail') {
    emit('detail', code)
    return
  }
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
</script>

<template>
  <t-primary-table
    :columns="columns"
    :data="tableRows"
    :loading="loading"
    :sort="sort ?? undefined"
    size="small"
    :header-affixed-top="true"
    :horizontal-scroll-affixed-bottom="true"
    row-key="code"
    table-layout="auto"
    :table-content-width="holdingMode ? '1900px' : '1380px'"
    @data-change="handleDataChange"
    @sort-change="handleSortChange"
  >
    <template #name-cell="{ row }">
      <div>
        <button type="button" class="fund-name-button" @click="emit('detail', row.code)">
          {{ row.name }}
        </button>
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
    <template #estimated-income-cell="{ row }">
      <div v-if="row.holding" class="font-mono tabular-nums">
        <p
          v-if="
            row.holding.estimatedIncome.amountText === '--' &&
            row.holding.estimatedIncome.percentText === '--'
          "
        >
          --
        </p>
        <template v-else>
          <p :class="trendClass(row.holding.estimatedIncome.trend)">
            {{ row.holding.estimatedIncome.amountText }}
          </p>
          <p :class="trendClass(row.holding.estimatedIncome.trend)">
            {{ row.holding.estimatedIncome.percentText }}
          </p>
        </template>
        <p
          v-if="shouldShowRowDate(row.estimatedAtText, estimatedAt)"
          class="text-xs text-(--td-text-color-placeholder)"
        >
          {{ formatRowDate(row.estimatedAtText, estimatedAt) }}
        </p>
      </div>
    </template>
    <template #today-income-cell="{ row }">
      <div v-if="row.holding" class="font-mono tabular-nums">
        <p
          v-if="
            row.holding.todayIncome.amountText === '--' &&
            row.holding.todayIncome.percentText === '--'
          "
        >
          --
        </p>
        <template v-else>
          <p :class="trendClass(row.holding.todayIncome.trend)">
            {{ row.holding.todayIncome.amountText }}
          </p>
          <p :class="trendClass(row.holding.todayIncome.trend)">
            {{ row.holding.todayIncome.percentText }}
          </p>
        </template>
        <p
          v-if="shouldShowRowDate(row.navDateText, navDate)"
          class="text-xs text-(--td-text-color-placeholder)"
        >
          {{ formatRowDate(row.navDateText, navDate) }}
        </p>
      </div>
    </template>
    <template #yesterday-income-cell="{ row }">
      <div v-if="row.holding" class="font-mono tabular-nums">
        <p
          v-if="
            row.holding.yesterdayIncome.amountText === '--' &&
            row.holding.yesterdayIncome.percentText === '--'
          "
        >
          --
        </p>
        <template v-else>
          <p :class="trendClass(row.holding.yesterdayIncome.trend)">
            {{ row.holding.yesterdayIncome.amountText }}
          </p>
          <p :class="trendClass(row.holding.yesterdayIncome.trend)">
            {{ row.holding.yesterdayIncome.percentText }}
          </p>
        </template>
        <p
          v-if="shouldShowRowDate(row.holding.yesterdayIncomeDateText, navDate)"
          class="text-xs text-(--td-text-color-placeholder)"
        >
          {{ formatRowDate(row.holding.yesterdayIncomeDateText, navDate) }}
        </p>
      </div>
    </template>
    <template #holding-income-cell="{ row }">
      <div v-if="row.holding" class="font-mono tabular-nums">
        <p :class="trendClass(row.holding.holdingIncome.trend)">
          {{ row.holding.holdingIncome.amountText }}
        </p>
        <p :class="trendClass(row.holding.holdingIncome.trend)">
          {{ row.holding.holdingIncome.percentText }}
        </p>
      </div>
    </template>
    <template #holding-amount-cell="{ row }">
      <span class="font-mono tabular-nums">{{ row.holding?.holdingAmountText ?? '--' }}</span>
    </template>
    <template #holding-days-cell="{ row }">
      <span class="font-mono tabular-nums">{{ row.holding?.holdingDaysText ?? '--' }}</span>
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
  hover:scrollbar-thumb-current scrollbar-thin;
}

.fund-name-button {
  @apply cursor-pointer whitespace-normal text-left hover:text-(--td-brand-color)
  focus-visible:outline;
}
</style>
