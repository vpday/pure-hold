import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot'
import type { FundReturnField, FundRowViewModel, FundTrend } from '../models/fundListViewModel'

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

export function toFundListViewModel(snapshot: FundSnapshot): FundRowViewModel {
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
    name: snapshot.name,
    navDateText: snapshot.navDate ?? '--',
    navText: formatNumber(snapshot.nav, 4),
    returns,
    returnsDateText: snapshot.returnsDate ?? '--',
    tags: snapshot.tags,
    trendByField: {
      ...returnTrends,
      dailyChangePercent: toTrend(snapshot.dailyChangePercent),
      estimatedChangePercent: toTrend(snapshot.estimatedChangePercent),
    },
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
