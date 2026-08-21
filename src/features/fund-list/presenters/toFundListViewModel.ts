import type { FundMarketData } from '@/domains/funds/models/fundMarketData'
import type { FundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics'
import type {
  FundCurrentIncomeViewModel,
  FundHoldingViewModel,
  FundIncomeViewModel,
  FundReturnField,
  FundRowViewModel,
  FundTrend,
} from '../models/fundListViewModel'

const returnFields = [
  'oneWeek',
  'oneMonth',
  'threeMonths',
  'sixMonths',
  'yearToDate',
  'oneYear',
  'twoYears',
  'threeYears',
  'fiveYears',
  'sinceInception',
] as const satisfies readonly FundReturnField[]

export function toFundListViewModel(
  marketData: FundMarketData,
  holdingMetrics?: FundHoldingMetrics,
): FundRowViewModel {
  const returns = Object.fromEntries(
    returnFields.map((field) => [field, formatPercent(marketData.returns[field])]),
  ) as Record<FundReturnField, string>
  const returnTrends = Object.fromEntries(
    returnFields.map((field) => [field, toTrend(marketData.returns[field])]),
  ) as Record<FundReturnField, FundTrend>

  return {
    code: marketData.code,
    dailyChangePercentText: formatPercent(marketData.dailyChangePercent),
    estimatedAtText: marketData.estimatedAt ?? '--',
    estimatedChangePercentText: formatPercent(marketData.estimatedChangePercent),
    estimatedNavText: formatNumber(marketData.estimatedNav, 4),
    holding: holdingMetrics ? toHoldingViewModel(holdingMetrics) : undefined,
    name: marketData.name,
    navDateText: marketData.navDate ?? '--',
    navText: formatNumber(marketData.nav, 4),
    returns,
    returnsDateText: marketData.returnsDate ?? '--',
    sortValues: {
      ...marketData.returns,
      dailyChangePercent: marketData.dailyChangePercent,
      estimatedChangePercent: marketData.estimatedChangePercent,
      estimatedIncome: holdingMetrics?.estimatedIncome ?? null,
      estimatedNav: marketData.estimatedNav,
      holdingAmount: holdingMetrics?.holdingAmount ?? null,
      holdingDays: holdingMetrics?.holdingDays ?? null,
      holdingIncomePercent: holdingMetrics?.holdingIncomePercent ?? null,
      nav: marketData.nav,
      todayIncome: holdingMetrics?.todayIncome ?? null,
      yesterdayIncome: holdingMetrics?.yesterdayIncome ?? null,
    },
    tags: marketData.tags,
    trendByField: {
      ...returnTrends,
      dailyChangePercent: toTrend(marketData.dailyChangePercent),
      estimatedChangePercent: toTrend(marketData.estimatedChangePercent),
    },
  }
}

function toHoldingViewModel(metrics: FundHoldingMetrics): FundHoldingViewModel {
  const estimatedIncome = toIncomeViewModel(metrics.estimatedIncome, metrics.estimatedIncomePercent)
  const todayIncome = toIncomeViewModel(metrics.todayIncome, metrics.todayIncomePercent)
  const yesterdayIncome = toIncomeViewModel(metrics.yesterdayIncome, metrics.yesterdayIncomePercent)
  const currentIncome: FundCurrentIncomeViewModel = {
    ...(metrics.currentIncomeSource === 'actual'
      ? todayIncome
      : metrics.currentIncomeSource === 'estimated'
        ? estimatedIncome
        : toIncomeViewModel(null, null)),
    label: metrics.currentIncomeSource === 'actual' ? '今日收益' : '估算收益',
    source: metrics.currentIncomeSource,
  }

  return {
    confirmedNavDateText: metrics.confirmedNavDate ?? '--',
    currentIncome,
    estimatedIncome,
    holdingAmountText: formatNumber(metrics.holdingAmount, 2),
    holdingDaysText: metrics.holdingDays === null ? '--' : `${metrics.holdingDays} 天`,
    holdingIncome: toIncomeViewModel(metrics.holdingIncome, metrics.holdingIncomePercent),
    sortValues: {
      estimatedIncome: metrics.estimatedIncome,
      holdingAmount: metrics.holdingAmount,
      holdingDays: metrics.holdingDays,
      holdingIncomePercent: metrics.holdingIncomePercent,
      todayIncome: metrics.todayIncome,
      yesterdayIncome: metrics.yesterdayIncome,
    },
    todayIncome,
    yesterdayIncome,
    yesterdayIncomeDateText: metrics.yesterdayIncomeDate ?? '--',
  }
}

function toIncomeViewModel(amount: number | null, percent: number | null): FundIncomeViewModel {
  return {
    amountText: formatSignedNumber(amount, 2),
    percentText: formatPercent(percent),
    trend: toTrend(amount),
  }
}

function formatNumber(value: number | null, digits: number): string {
  return value === null ? '--' : value.toFixed(digits)
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return '--'
  }
  const text = `${value.toFixed(2)}%`
  return value > 0 ? `+${text}` : text
}

function formatSignedNumber(value: number | null, digits: number): string {
  if (value === null) return '--'
  const text = value.toFixed(digits)
  return value > 0 ? `+${text}` : text
}

function toTrend(value: number | null): FundTrend {
  if (value === null) {
    return 'unknown'
  }
  if (value > 0) {
    return 'up'
  }
  if (value < 0) {
    return 'down'
  }
  return 'flat'
}
