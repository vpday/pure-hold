<script setup lang="ts">
import { computed, h } from 'vue'
import type { DropdownProps, PrimaryTableProps } from 'tdesign-vue-next'

import { formatRowDate } from '@/shared/presenters/formatRowDate'
import type {
  FundReturnField,
  FundRowViewModel,
  FundSort,
  FundSortField,
  FundTrend,
} from '../models/fundListViewModel'
import {
  fundTagTheme,
  isEstimatedQuoteEmpty,
  isIncomeEmpty,
  shouldShowIncomeDate,
} from '../presenters/fundDisplayRules'

const props = defineProps<{
  estimatedAt: string
  holdingMode: boolean
  loading: boolean
  navDate: string
  rows: readonly FundRowViewModel[]
  sort: FundSort | null
}>()
const emit = defineEmits<{
  buy: [code: string]
  comingSoon: []
  delete: [code: string]
  detail: [code: string]
  edit: [code: string]
  sell: [code: string]
  sortChange: [sort: FundSort | null]
}>()
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
const sortableFields = new Set<FundSortField>([
  'dailyChangePercent',
  'estimatedChangePercent',
  'estimatedIncome',
  'holdingAmount',
  'holdingDays',
  'holdingIncomePercent',
  'todayIncome',
  'yesterdayIncome',
  ...returnColumns.map(({ colKey }) => colKey),
])
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
      sorter: true,
      width: 120,
      title: () => renderQuoteTitle('净值估算', estimatedAt),
    },
    {
      cell: 'nav-cell',
      colKey: 'dailyChangePercent',
      sorter: true,
      width: 100,
      title: () => renderQuoteTitle('单位净值', navDate),
    },
  ]
  const actionColumn = {
    cell: 'actions-cell',
    colKey: 'actions',
    fixed: 'right' as const,
    title: '操作',
    width: 90,
  }

  if (props.holdingMode) {
    return [
      nameColumn,
      {
        cell: 'estimated-income-cell',
        colKey: 'estimatedIncome',
        sorter: true,
        title: () => renderQuoteTitle('估算收益', estimatedAt),
      },
      {
        cell: 'today-income-cell',
        colKey: 'todayIncome',
        sorter: true,
        title: () => renderQuoteTitle('今日收益', navDate),
      },
      {
        cell: 'yesterday-income-cell',
        colKey: 'yesterdayIncome',
        sorter: true,
        title: () => renderQuoteTitle('昨日收益', navDate),
      },
      ...quoteColumns,
      {
        cell: 'holding-income-cell',
        colKey: 'holdingIncomePercent',
        sorter: true,
        title: '持仓收益',
      },
      {
        cell: 'holding-amount-cell',
        colKey: 'holdingAmount',
        sorter: true,
        title: '持仓金额',
      },
      {
        cell: 'holding-days-cell',
        colKey: 'holdingDays',
        sorter: true,
        title: '持有天数',
      },
      ...returnColumns.map((column) => ({
        ...column,
        sorter: true,
      })),
      actionColumn,
    ]
  }

  return [
    nameColumn,
    ...quoteColumns,
    ...returnColumns.map((column) => ({
      ...column,
      sorter: true,
    })),
    actionColumn,
  ]
})
const moreActionOptions = [
  { content: '详情', value: 'detail' },
  { content: '编辑', value: 'edit' },
  { content: '记录买入', value: 'buy' },
  { content: '记录卖出', value: 'sell' },
  { content: '删除', theme: 'error', value: 'delete' },
] satisfies NonNullable<DropdownProps['options']>

function handleSortChange(value: unknown): void {
  if (!isTableSort(value)) {
    emit('sortChange', null)
    return
  }
  emit('sortChange', {
    descending: value.descending,
    sortBy: value.sortBy,
  })
}

function isTableSort(
  value: unknown,
): value is { readonly descending: boolean; readonly sortBy: FundSortField } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'sortBy' in value &&
    typeof value.sortBy === 'string' &&
    sortableFields.has(value.sortBy as FundSortField) &&
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
    emit('delete', code)
    return
  }
  if (value === 'buy') {
    emit('buy', code)
    return
  }
  if (value === 'sell') {
    emit('sell', code)
    return
  }
  emit('comingSoon')
}

function shouldShowRowDate(rowDate: string, headerDate: string): boolean {
  const formatted = formatRowDate(rowDate, headerDate)
  return formatted !== '--' && formatted !== headerDate
}
</script>

<template>
  <t-primary-table
    :columns="columns"
    :data="rows"
    :loading="loading"
    :sort="sort ?? undefined"
    size="small"
    :header-affixed-top="true"
    :horizontal-scroll-affixed-bottom="true"
    row-key="code"
    table-layout="fixed"
    table-content-width="1380px"
    @sort-change="handleSortChange"
  >
    <template #name-cell="{ row }">
      <p class="fund-name-button" :title="row.name" @click="emit('detail', row.code)">
        {{ row.name }}
      </p>
      <div class="fund-code-tags">
        <t-tag variant="light" size="small">{{ row.code }}</t-tag>
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
        <p v-if="isIncomeEmpty(row.holding.estimatedIncome)">--</p>
        <template v-else>
          <p :class="trendClass(row.holding.estimatedIncome.trend)">
            {{ row.holding.estimatedIncome.amountText }}
          </p>
          <p :class="trendClass(row.holding.estimatedIncome.trend)">
            {{ row.holding.estimatedIncome.percentText }}
          </p>
        </template>
        <p
          v-if="shouldShowIncomeDate(row.holding.estimatedIncome, row.estimatedAtText, estimatedAt)"
          class="text-xs text-(--td-text-color-placeholder)"
        >
          {{ formatRowDate(row.estimatedAtText, estimatedAt) }}
        </p>
      </div>
    </template>
    <template #today-income-cell="{ row }">
      <div v-if="row.holding" class="font-mono tabular-nums">
        <p v-if="isIncomeEmpty(row.holding.todayIncome)">--</p>
        <template v-else>
          <p :class="trendClass(row.holding.todayIncome.trend)">
            {{ row.holding.todayIncome.amountText }}
          </p>
          <p :class="trendClass(row.holding.todayIncome.trend)">
            {{ row.holding.todayIncome.percentText }}
          </p>
        </template>
        <p
          v-if="shouldShowIncomeDate(row.holding.todayIncome, row.navDateText, navDate)"
          class="text-xs text-(--td-text-color-placeholder)"
        >
          {{ formatRowDate(row.navDateText, navDate) }}
        </p>
      </div>
    </template>
    <template #yesterday-income-cell="{ row }">
      <div v-if="row.holding" class="font-mono tabular-nums">
        <p v-if="isIncomeEmpty(row.holding.yesterdayIncome)">--</p>
        <template v-else>
          <p :class="trendClass(row.holding.yesterdayIncome.trend)">
            {{ row.holding.yesterdayIncome.amountText }}
          </p>
          <p :class="trendClass(row.holding.yesterdayIncome.trend)">
            {{ row.holding.yesterdayIncome.percentText }}
          </p>
        </template>
        <p
          v-if="
            shouldShowIncomeDate(
              row.holding.yesterdayIncome,
              row.holding.yesterdayIncomeDateText,
              navDate,
            )
          "
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
      <t-dropdown
        :options="moreActionOptions"
        trigger="hover"
        @click="handleMoreAction(row.code, $event.value)"
      >
        <t-button size="small" variant="text">更多... </t-button>
      </t-dropdown>
    </template>
  </t-primary-table>
</template>

<style scoped>
@reference '@/style.css';

.fund-code-tags {
  @apply mt-1 flex max-w-35 gap-1 scrollbar-thumb-transparent hover:scrollbar-thumb-current overflow-x-auto overscroll-contain scrollbar-thin;
}

.fund-name-button {
  @apply cursor-pointer hover:text-(--td-brand-color) focus-visible:outline;
}
</style>
