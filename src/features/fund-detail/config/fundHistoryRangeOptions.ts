import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'

export interface FundHistoryRangeOption {
  readonly label: string
  readonly value: FundHistoryRange
}

export const defaultFundHistoryRange = '6y' as const

export const fundHistoryRangeOptions: readonly FundHistoryRangeOption[] = [
  { label: '近1月', value: 'y' },
  { label: '近3月', value: '3y' },
  { label: '近6月', value: '6y' },
  { label: '近1年', value: 'n' },
  { label: '近3年', value: '3n' },
  { label: '近5年', value: '5n' },
  { label: '今年来', value: 'jn' },
  { label: '成立来', value: 'ln' },
]
