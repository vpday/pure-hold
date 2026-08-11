import type { FundTrend } from './fundListViewModel'

export interface FundHoldingStatisticValueViewModel {
  readonly amount: number | null
  readonly amountText: string
  readonly rate: number | null
  readonly rateText: string
  readonly trend: FundTrend
}

export interface FundHoldingStatisticsViewModel {
  readonly currentIncome: FundHoldingStatisticValueViewModel
  readonly currentIncomeLabel: '当日收益' | '估算收益' | '当日/估算收益'
  readonly fundCount: number
  readonly holdingIncome: FundHoldingStatisticValueViewModel
  readonly holdingAmount: FundHoldingStatisticValueViewModel
  readonly yesterdayIncome: FundHoldingStatisticValueViewModel
}
