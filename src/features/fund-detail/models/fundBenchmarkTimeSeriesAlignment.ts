import type { FundReinvestedNavPoint } from '@/domains/funds/models/fundReinvestedNav.ts'
import type { IndexPerformancePoint } from '@/domains/indices/models/indexPerformanceHistory.ts'

export interface FundBenchmarkAlignedPoint {
  readonly benchmarkPoint: IndexPerformancePoint
  readonly date: string
  readonly fundPoint: FundReinvestedNavPoint
}

export interface FundBenchmarkTimeSeriesAlignment {
  readonly benchmarkPoints: readonly IndexPerformancePoint[]
  readonly commonCutoffDate: string | null
  readonly commonPoints: readonly FundBenchmarkAlignedPoint[]
  readonly fundPoints: readonly FundReinvestedNavPoint[]
}

export function alignFundBenchmarkTimeSeries(
  fundSource: readonly FundReinvestedNavPoint[],
  benchmarkSource: readonly IndexPerformancePoint[],
): FundBenchmarkTimeSeriesAlignment {
  const fundPoints = validFundPoints(fundSource)
  const benchmarkPoints = validBenchmarkPoints(benchmarkSource)
  const benchmarkByDate = new Map(benchmarkPoints.map((point) => [point.date, point]))
  const commonPoints = fundPoints.flatMap((fundPoint) => {
    const benchmarkPoint = benchmarkByDate.get(fundPoint.date)
    return benchmarkPoint ? [{ benchmarkPoint, date: fundPoint.date, fundPoint }] : []
  })

  return {
    benchmarkPoints,
    commonCutoffDate: commonPoints.at(-1)?.date ?? null,
    commonPoints,
    fundPoints,
  }
}

function validFundPoints(
  source: readonly FundReinvestedNavPoint[],
): readonly FundReinvestedNavPoint[] {
  return uniqueByDate(
    source.filter(
      ({ date, reinvestedNetValue }) =>
        isIsoDate(date) && Number.isFinite(reinvestedNetValue) && reinvestedNetValue > 0,
    ),
  )
}

function validBenchmarkPoints(
  source: readonly IndexPerformancePoint[],
): readonly IndexPerformancePoint[] {
  return uniqueByDate(
    source.filter(({ date, value }) => isIsoDate(date) && Number.isFinite(value) && value > 0),
  )
}

function uniqueByDate<T extends { readonly date: string }>(source: readonly T[]): readonly T[] {
  const byDate = new Map<string, T>()
  for (const point of source) {
    if (!byDate.has(point.date)) byDate.set(point.date, point)
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date))
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
