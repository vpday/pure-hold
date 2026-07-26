import type { FundRowViewModel } from '../models/fundListViewModel'

export function fundTagTheme(label: string): 'danger' | 'success' | undefined {
  if (label.includes('新低') || label.includes('连跌')) return 'success'
  if (label.includes('日限额') || label.includes('新高') || label.includes('连涨')) return 'danger'
  return undefined
}

export function isEstimatedQuoteEmpty(
  row: Pick<
    FundRowViewModel,
    'estimatedAtText' | 'estimatedChangePercentText' | 'estimatedNavText'
  >,
): boolean {
  return (
    row.estimatedNavText === '--' &&
    row.estimatedChangePercentText === '--' &&
    row.estimatedAtText === '--'
  )
}
