import type { FundCumulativeReturns } from '@/domains/funds/models/fundCumulativeReturns.ts'
import { analyzeFundDrawdown } from '@/domains/funds/models/fundDrawdown.ts'
import type { FundPerformanceChartModel } from '../models/fundPerformance'

export function toFundPerformanceChartModel(
  returns: FundCumulativeReturns,
  referenceIndexName: string,
  rangeLabel: string,
): FundPerformanceChartModel {
  const latestPoint = returns.points.at(-1)
  const drawdown = analyzeFundDrawdown(returns.points)
  const maximumDrawdownPercent = returns.maximumDrawdownPercent ?? drawdown?.maximumDrawdownPercent
  return {
    dates: returns.points.map(({ date }) => date),
    ...(drawdown
      ? {
          drawdown: {
            peakIndex: drawdown.peakIndex,
            troughIndex: drawdown.troughIndex,
          },
        }
      : {}),
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
        valueText: formatPercent(maximumDrawdownPercent),
      },
    ],
  }
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : `${value.toFixed(2)}%`
}
