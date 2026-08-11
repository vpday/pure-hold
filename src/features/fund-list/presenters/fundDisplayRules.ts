import { formatRowDate } from '@/shared/presenters/formatRowDate'
import type { FundIncomeViewModel, FundRowViewModel } from '../models/fundListViewModel'

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

export function isIncomeEmpty(
  income: Pick<FundIncomeViewModel, 'amountText' | 'percentText'>,
): boolean {
  return income.amountText === '--' && income.percentText === '--'
}

export function shouldShowIncomeDate(
  income: Pick<FundIncomeViewModel, 'amountText' | 'percentText'>,
  rowDate: string,
  headerDate?: string,
): boolean {
  if (isIncomeEmpty(income)) return false
  const formatted = formatRowDate(rowDate, headerDate)
  return formatted !== '--' && formatted !== headerDate
}
