import type { FundSort } from '../models/fundListViewModel.ts'

export function clearFundCategorySorts(
  sortByCategory: Readonly<Record<string, FundSort | null>>,
  categoryIds: readonly string[],
): Record<string, FundSort | null> {
  const next = { ...sortByCategory }
  for (const categoryId of categoryIds) {
    delete next[categoryId]
  }
  return next
}
