import type {
  FundHoldingStatistics,
  FundHoldingStatisticsIncomeSource,
} from '@/domains/funds/models/fundHoldingStatistics.ts'
import type {
  FundHoldingStatisticValueViewModel,
  FundHoldingStatisticsViewModel,
} from '../models/fundHoldingStatisticsViewModel.ts'

export interface ToFundHoldingStatisticsViewModelInput {
  readonly fundCount: number
  readonly statistics: FundHoldingStatistics
}

export function toFundHoldingStatisticsViewModel({
  fundCount,
  statistics,
}: ToFundHoldingStatisticsViewModelInput): FundHoldingStatisticsViewModel {
  return {
    currentIncome: toStatisticValue(
      statistics.currentIncome,
      statistics.currentIncomePercent,
      true,
    ),
    currentIncomeLabel: currentIncomeLabel(statistics.currentIncomeSource),
    fundCount,
    holdingAmount: toStatisticValue(statistics.holdingAmount, null, false),
    holdingIncome: toStatisticValue(
      statistics.holdingIncome,
      statistics.holdingIncomePercent,
      true,
    ),
    yesterdayIncome: toStatisticValue(
      statistics.yesterdayIncome,
      statistics.yesterdayIncomePercent,
      true,
    ),
  }
}

function toStatisticValue(
  amount: number | null,
  rate: number | null,
  signed: boolean,
): FundHoldingStatisticValueViewModel {
  return {
    amount,
    amountText: signed ? formatSignedCurrency(amount) : formatCurrency(amount),
    rate,
    rateText: formatPercent(rate),
    trend: toTrend(amount),
  }
}

function currentIncomeLabel(
  source: FundHoldingStatisticsIncomeSource,
): FundHoldingStatisticsViewModel['currentIncomeLabel'] {
  if (source === 'estimated') return '估算收益'
  if (source === 'mixed') return '当日/估算收益'
  return '当日收益'
}

function formatCurrency(value: number | null): string {
  return value === null ? '--' : `¥${formatAbsolute(value)}`
}

function formatSignedCurrency(value: number | null): string {
  if (value === null) return '--'
  if (value === 0) return '¥0.00'
  return `${value > 0 ? '+' : '-'}¥${formatAbsolute(value)}`
}

function formatAbsolute(value: number): string {
  return Math.abs(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
}

function formatPercent(value: number | null): string {
  if (value === null) return '--'
  const text = `${Math.abs(value).toFixed(2)}%`
  if (value > 0) return `+${text}`
  if (value < 0) return `-${text}`
  return '0.00%'
}

function toTrend(value: number | null): FundHoldingStatisticValueViewModel['trend'] {
  if (value === null) return 'unknown'
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}
