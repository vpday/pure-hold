import type { FundRollingExcessRange } from '../models/fundRollingExcessReturn.ts'

export interface FundRollingExcessRangeOption {
  readonly label: string
  readonly value: FundRollingExcessRange
}

export const defaultFundRollingExcessRange = 'n' as const

export const fundRollingExcessRangeOptions: readonly FundRollingExcessRangeOption[] = [
  { label: '近1年', value: 'n' },
  { label: '近3年', value: '3n' },
  { label: '近5年', value: '5n' },
  { label: '成立来', value: 'ln' },
]
