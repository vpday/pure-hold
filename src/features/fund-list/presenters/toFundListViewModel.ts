import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot'
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
  snapshot: FundSnapshot,
  holdingMetrics?: FundHoldingMetrics,
): FundRowViewModel {
  const returns = Object.fromEntries(
    returnFields.map((field) => [field, formatPercent(snapshot.returns[field])]),
  ) as Record<FundReturnField, string>
  const returnTrends = Object.fromEntries(
    returnFields.map((field) => [field, toTrend(snapshot.returns[field])]),
  ) as Record<FundReturnField, FundTrend>

  return {
    code: snapshot.code,
    dailyChangePercentText: formatPercent(snapshot.dailyChangePercent),
    estimatedAtText: snapshot.estimatedAt ?? '--',
    estimatedChangePercentText: formatPercent(snapshot.estimatedChangePercent),
    estimatedNavText: formatNumber(snapshot.estimatedNav, 4),
    holding: holdingMetrics ? toHoldingViewModel(holdingMetrics) : undefined,
    name: snapshot.name,
    navDateText: snapshot.navDate ?? '--',
    navText: formatNumber(snapshot.nav, 4),
    returns,
    returnsDateText: snapshot.returnsDate ?? '--',
    sortValues: {
      ...snapshot.returns,
      dailyChangePercent: snapshot.dailyChangePercent,
      estimatedChangePercent: snapshot.estimatedChangePercent,
      estimatedIncomePercent: holdingMetrics?.estimatedIncomePercent ?? null,
      estimatedNav: snapshot.estimatedNav,
      holdingAmount: holdingMetrics?.holdingAmount ?? null,
      holdingDays: holdingMetrics?.holdingDays ?? null,
      holdingIncomePercent: holdingMetrics?.holdingIncomePercent ?? null,
      nav: snapshot.nav,
      todayIncomePercent: holdingMetrics?.todayIncomePercent ?? null,
      yesterdayIncomePercent: holdingMetrics?.yesterdayIncomePercent ?? null,
    },
    tags: snapshot.tags,
    trendByField: {
      ...returnTrends,
      dailyChangePercent: toTrend(snapshot.dailyChangePercent),
      estimatedChangePercent: toTrend(snapshot.estimatedChangePercent),
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
      estimatedIncomePercent: metrics.estimatedIncomePercent,
      holdingAmount: metrics.holdingAmount,
      holdingDays: metrics.holdingDays,
      holdingIncomePercent: metrics.holdingIncomePercent,
      todayIncomePercent: metrics.todayIncomePercent,
      yesterdayIncomePercent: metrics.yesterdayIncomePercent,
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
