import type { FundSearchItem } from '../../../domains/funds/models/fundSearch.ts'

export function toggleFundSelection(
  selection: readonly FundSearchItem[],
  item: FundSearchItem,
): readonly FundSearchItem[] {
  return selection.some(({ code }) => code === item.code)
    ? selection.filter(({ code }) => code !== item.code)
    : [...selection, item]
}

export function removeFundSelection(
  selection: readonly FundSearchItem[],
  code: string,
): readonly FundSearchItem[] {
  return selection.filter((item) => item.code !== code)
}
