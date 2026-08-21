import type { FundRowViewModel, FundSort, FundSortField } from '../models/fundListViewModel'

export function sortFundRows(
  rows: readonly FundRowViewModel[],
  sort: FundSort | null,
): FundRowViewModel[] {
  if (!sort) return [...rows]

  const compare = createFundRowComparator(sort.sortBy)
  const sortedRows = rows
    .map((row, index) => ({ index, row }))
    .sort((left, right) => {
      const comparison = sort.descending
        ? compare(right.row, left.row)
        : compare(left.row, right.row)
      return comparison === 0 ? left.index - right.index : comparison
    })
    .map(({ row }) => row)

  return moveMissingFundRowsLast(sortedRows, sort.sortBy)
}

function createFundRowComparator(
  field: FundSortField,
): (left: FundRowViewModel, right: FundRowViewModel) => number {
  return (left, right) => compareFundSortValues(left.sortValues[field], right.sortValues[field])
}

function moveMissingFundRowsLast(
  rows: readonly FundRowViewModel[],
  field: FundSortField,
): FundRowViewModel[] {
  const available: FundRowViewModel[] = []
  const missing: FundRowViewModel[] = []
  for (const row of rows) {
    if (row.sortValues[field] === null) missing.push(row)
    else available.push(row)
  }
  return [...available, ...missing]
}

function compareFundSortValues(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return left - right
}
