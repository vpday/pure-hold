import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot'
import type { FundSort, FundSortField } from '../models/fundListViewModel'

export function sortFundSnapshots(
  snapshots: readonly FundSnapshot[],
  sort: FundSort | null,
): FundSnapshot[] {
  if (!sort) {
    return [...snapshots]
  }

  return snapshots
    .map((snapshot, index) => ({ index, snapshot, value: sortableValue(snapshot, sort.sortBy) }))
    .sort((left, right) => {
      if (left.value === null && right.value === null) {
        return left.index - right.index
      }
      if (left.value === null) {
        return 1
      }
      if (right.value === null) {
        return -1
      }
      const comparison = left.value - right.value
      return comparison === 0
        ? left.index - right.index
        : sort.descending
          ? -comparison
          : comparison
    })
    .map(({ snapshot }) => snapshot)
}

function sortableValue(snapshot: FundSnapshot, field: FundSortField): number | null {
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
