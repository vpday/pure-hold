import { computed, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from 'vue'

import { calculateFundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics.ts'
import type { FundGroupDefinition } from '@/domains/funds/models/fundGroupDefinition.ts'
import type { FundHolding } from '@/domains/funds/models/fundHolding.ts'
import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot.ts'
import type { FundRefreshIssue } from '@/domains/funds/services/tiantian/fundRefreshIssue.ts'
import type { FundRowViewModel, FundSort } from '../models/fundListViewModel.ts'
import { buildFundCategories, type FundCategory } from '../presenters/buildFundCategories.ts'
import { clearFundCategorySorts } from '../presenters/clearFundCategorySorts.ts'
import { formatEstimatedDisplayDate, formatNavDisplayDate } from '../presenters/formatFundDates.ts'
import { sortFundRows } from '../presenters/sortFundSnapshots.ts'
import { toFundListViewModel } from '../presenters/toFundListViewModel.ts'

export interface FundListRefreshNotice {
  readonly level: 'error' | 'warning'
  readonly message: string
}

export interface FundListSessionModel {
  readonly activeCategory: FundCategory
  readonly activeSort: FundSort | null
  readonly categories: readonly FundCategory[]
  readonly categoryTabs: readonly { readonly label: string; readonly value: string }[]
  readonly holdingMode: boolean
  readonly latestEstimatedAt: string
  readonly latestNavDate: string
  readonly refreshNotices: readonly FundListRefreshNotice[]
  readonly rows: readonly FundRowViewModel[]
}

export interface UseFundListSessionInputs {
  readonly fundOrder: MaybeRefOrGetter<readonly string[]>
  readonly groups: MaybeRefOrGetter<readonly FundGroupDefinition[]>
  readonly holdingOrder: MaybeRefOrGetter<readonly string[]>
  readonly holdingsByCode: MaybeRefOrGetter<Readonly<Record<string, FundHolding>>>
  readonly lastRefreshIssues: MaybeRefOrGetter<readonly FundRefreshIssue[]>
  readonly previousSnapshotsByCode: MaybeRefOrGetter<Readonly<Record<string, FundSnapshot>>>
  readonly snapshotsByCode: MaybeRefOrGetter<Readonly<Record<string, FundSnapshot>>>
  readonly now?: () => Date
}

export interface FundListSession {
  readonly model: ComputedRef<FundListSessionModel>
  clearCategorySorts(categoryIds: readonly string[]): void
  selectCategory(categoryId: string): void
  setSort(sort: FundSort | null): void
}

export function useFundListSession(inputs: UseFundListSessionInputs): FundListSession {
  const activeCategoryId = ref('all')
  const sortByCategory = ref<Record<string, FundSort | null>>({})
  const now = inputs.now ?? (() => new Date())
  const categories = computed(() =>
    buildFundCategories(
      toValue(inputs.fundOrder),
      toValue(inputs.holdingOrder),
      toValue(inputs.groups),
    ),
  )
  const activeCategory = computed(
    () => categories.value.find(({ id }) => id === activeCategoryId.value) ?? categories.value[0]!,
  )

  watch(categories, (nextCategories) => {
    if (!nextCategories.some(({ id }) => id === activeCategoryId.value)) {
      activeCategoryId.value = 'all'
    }
  })

  const model = computed<FundListSessionModel>(() => {
    const category = activeCategory.value
    const holdingMode = category.id === 'holdings'
    const snapshotsByCode = toValue(inputs.snapshotsByCode)
    const holdingsByCode = toValue(inputs.holdingsByCode)
    const previousSnapshotsByCode = toValue(inputs.previousSnapshotsByCode)
    const currentTime = now()
    const today = shanghaiDate(currentTime)
    const baseRows = category.fundCodes.flatMap((code) => {
      const snapshot = snapshotsByCode[code]
      if (!snapshot || snapshot.code !== code) return []
      const holding = holdingMode ? holdingsByCode[code] : undefined
      const metrics = holding
        ? calculateFundHoldingMetrics({
            currentSnapshot: snapshot,
            holding,
            previousConfirmedSnapshot: previousSnapshotsByCode[code],
            today,
          })
        : undefined
      return [toFundListViewModel(snapshot, metrics)]
    })
    const activeSort = sortByCategory.value[category.id] ?? null

    return {
      activeCategory: category,
      activeSort,
      categories: categories.value,
      categoryTabs: categories.value.map(({ fundCodes, id, name }) => ({
        label: `${name}（${fundCodes.length}）`,
        value: id,
      })),
      holdingMode,
      latestEstimatedAt: formatEstimatedDisplayDate(
        latestText(baseRows.map(({ estimatedAtText }) => estimatedAtText)),
        currentTime,
      ),
      latestNavDate: formatNavDisplayDate(
        latestText(baseRows.map(({ navDateText }) => navDateText)),
      ),
      refreshNotices: buildRefreshNotices(
        toValue(inputs.lastRefreshIssues),
        baseRows,
        snapshotsByCode,
      ),
      rows: sortFundRows(baseRows, activeSort),
    }
  })

  function selectCategory(categoryId: string): void {
    if (categories.value.some(({ id }) => id === categoryId)) activeCategoryId.value = categoryId
  }

  function setSort(sort: FundSort | null): void {
    sortByCategory.value = { ...sortByCategory.value, [activeCategory.value.id]: sort }
  }

  function clearCategorySorts(categoryIds: readonly string[]): void {
    sortByCategory.value = clearFundCategorySorts(sortByCategory.value, categoryIds)
  }

  return { clearCategorySorts, model, selectCategory, setSort }
}

function buildRefreshNotices(
  issues: readonly FundRefreshIssue[],
  rows: readonly FundRowViewModel[],
  snapshotsByCode: Readonly<Record<string, FundSnapshot>>,
): readonly FundListRefreshNotice[] {
  const notices: FundListRefreshNotice[] = []
  if (issues.some(({ code }) => code === 'persistence-failed')) {
    notices.push({
      level: 'warning',
      message: '刷新成功，但未能保存；刷新页面后可能恢复旧数据',
    })
  }
  if (issues.some(({ code }) => code === 'cache-fallback')) {
    notices.push({ level: 'warning', message: '网络刷新失败，已显示缓存数据' })
  }
  if (issues.some(({ code }) => code !== 'persistence-failed' && code !== 'cache-fallback')) {
    const hasFreshData = rows.some(({ code }) => snapshotsByCode[code]?.fetchedAt !== null)
    notices.push({
      level: 'error',
      message: hasFreshData ? '部分基金刷新失败' : '基金刷新失败，请稍后重试',
    })
  }
  return notices
}

function latestText(values: readonly string[]): string {
  const available = values.filter((value) => value !== '--')
  return available.sort().at(-1) ?? '--'
}

function shanghaiDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
