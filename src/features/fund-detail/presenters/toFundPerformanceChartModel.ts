import type { FundCumulativeReturns } from '@/domains/funds/models/fundCumulativeReturns'
import type { FundPerformanceChartModel } from '../models/fundPerformance'

export function toFundPerformanceChartModel(
  returns: FundCumulativeReturns,
  referenceIndexName: string,
  rangeLabel: string,
): FundPerformanceChartModel {
  const latestPoint = returns.points.at(-1)
  return {
    dates: returns.points.map(({ date }) => date),
    series: [
      {
        name: '基金累计收益',
        values: returns.points.map(({ fundYieldPercent }) => fundYieldPercent),
      },
      {
        name: referenceIndexName,
        values: returns.points.map(({ referenceIndexYieldPercent }) => referenceIndexYieldPercent),
      },
      {
        name: '同类基金收益',
        values: returns.points.map(({ fundTypeYieldPercent }) => fundTypeYieldPercent),
      },
    ],
    summary: [
      {
        color: 'fund',
        label: rangeLabel,
        valueText: formatPercent(latestPoint?.fundYieldPercent),
      },
      {
        color: 'peer',
        label: '同类平均',
        valueText: formatPercent(latestPoint?.fundTypeYieldPercent),
      },
      {
        color: 'reference',
        label: referenceIndexName,
        valueText: formatPercent(latestPoint?.referenceIndexYieldPercent),
      },
      {
        color: 'drawdown',
        label: '最大回撤',
        valueText: formatPercent(returns.maximumDrawdownPercent),
      },
    ],
  }
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : `${value.toFixed(2)}%`
}
