import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot'
import type {
  FundHoldingSortField,
  FundRowViewModel,
  FundSort,
  FundSortField,
} from '../models/fundListViewModel'

const holdingSortFields = new Set<FundSortField>([
  'estimatedIncomePercent',
  'holdingAmount',
  'holdingDays',
  'holdingIncomePercent',
  'todayIncomePercent',
  'yesterdayIncomePercent',
])

export function sortFundSnapshots(
  snapshots: readonly FundSnapshot[],
  sort: FundSort | null,
): FundSnapshot[] {
  if (!sort) {
    return [...snapshots]
  }

  return stableSortByValue(snapshots, sort.descending, (snapshot) =>
    sortableValue(snapshot, sort.sortBy),
  )
}

export function sortFundRows(
  rows: readonly FundRowViewModel[],
  sort: FundSort | null,
): FundRowViewModel[] {
  if (!sort || !isFundHoldingSortField(sort.sortBy)) return [...rows]
  return stableSortByValue(
    rows,
    sort.descending,
    (row) => row.holding?.sortValues[sort.sortBy as FundHoldingSortField] ?? null,
  )
}

export function isFundHoldingSortField(field: FundSortField): field is FundHoldingSortField {
  return holdingSortFields.has(field)
}

function stableSortByValue<T>(
  values: readonly T[],
  descending: boolean,
  valueOf: (value: T) => number | null,
): T[] {
  return values
    .map((value, index) => ({ index, value, sortValue: valueOf(value) }))
    .sort((left, right) => {
      if (left.sortValue === null && right.sortValue === null) {
        return left.index - right.index
      }
      if (left.sortValue === null) {
        return 1
      }
      if (right.sortValue === null) {
        return -1
      }
      const comparison = left.sortValue - right.sortValue
      return comparison === 0 ? left.index - right.index : descending ? -comparison : comparison
    })
    .map(({ value }) => value)
}

function sortableValue(snapshot: FundSnapshot, field: FundSortField): number | null {
  if (isFundHoldingSortField(field)) return null
  switch (field) {
    case 'dailyChangePercent':
      return snapshot.dailyChangePercent
    case 'estimatedChangePercent':
      return snapshot.estimatedChangePercent
    case 'estimatedNav':
      return snapshot.estimatedNav
    case 'nav':
      return snapshot.nav
    default:
      return snapshot.returns[field]
  }
}
