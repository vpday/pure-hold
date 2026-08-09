import type { FundDrawdownRange } from '../models/fundDrawdownComparison.ts'

export interface FundDrawdownRangeOption {
  readonly label: string
  readonly value: FundDrawdownRange
}

export const defaultFundDrawdownRange = 'n' as const

export const fundDrawdownRangeOptions: readonly FundDrawdownRangeOption[] = [
  { label: '近1年', value: 'n' },
  { label: '近3年', value: '3n' },
  { label: '近5年', value: '5n' },
  { label: '成立来', value: 'ln' },
]
