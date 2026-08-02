import type { FundReinvestedNavPoint } from '@/domains/funds/models/fundReinvestedNav.ts'
import {
  calculateFundReturnMetrics,
  calculateReturnMetrics,
  type FundReturnMetrics,
} from '@/domains/funds/models/fundReturnMetrics.ts'
import type { IndexPerformancePoint } from '@/domains/indices/models/indexPerformanceHistory.ts'

type PeriodKey = keyof FundReturnMetrics['periods']
type AnnualizedKey = keyof FundReturnMetrics['annualized']

export interface FundMetricComparisonValue {
  readonly benchmark: number | null
  readonly excess: number | null
  readonly fund: number | null
}

export interface FundMetricComparisonQuarter extends FundMetricComparisonValue {
  readonly quarter: 1 | 2 | 3 | 4
  readonly year: number
}

export interface FundMetricComparisonYear extends FundMetricComparisonValue {
  readonly year: number
}

export interface FundMetricsComparison {
  readonly annualized: Readonly<Record<AnnualizedKey, FundMetricComparisonValue>>
  readonly annualReturns: readonly FundMetricComparisonYear[]
  readonly commonCutoffDate: string
  readonly periods: Readonly<Record<PeriodKey, FundMetricComparisonValue>>
  readonly quarterlyReturns: readonly FundMetricComparisonQuarter[]
}

const periodKeys = [
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
] as const satisfies readonly PeriodKey[]

const annualizedKeys = [
  'oneYear',
  'twoYears',
  'threeYears',
  'fiveYears',
  'sinceInception',
] as const satisfies readonly AnnualizedKey[]

const quarters = [
  { field: 'fourthQuarter', quarter: 4 },
  { field: 'thirdQuarter', quarter: 3 },
  { field: 'secondQuarter', quarter: 2 },
  { field: 'firstQuarter', quarter: 1 },
] as const

export function calculateFundMetricsComparison(
  fundSource: readonly FundReinvestedNavPoint[],
  benchmarkSource: readonly IndexPerformancePoint[],
): FundMetricsComparison {
  const fundPoints = validFundPoints(fundSource)
  const benchmarkPoints = validBenchmarkPoints(benchmarkSource)
  const benchmarkDates = new Set(benchmarkPoints.map(({ date }) => date))
  const commonCutoffDate = latestCommonDate(fundPoints, benchmarkDates)
  if (!commonCutoffDate) throw new Error('Fund and benchmark have no common performance date')

  const fundMetrics = calculateFundReturnMetrics(
    fundPoints.filter(({ date }) => date <= commonCutoffDate),
  )
  const benchmarkMetrics = calculateReturnMetrics(
    benchmarkPoints.filter(({ date }) => date <= commonCutoffDate),
  )

  return {
    annualized: Object.fromEntries(
      annualizedKeys.map((key) => [
        key,
        key === 'sinceInception'
          ? comparison(fundMetrics.annualized[key], null)
          : comparison(fundMetrics.annualized[key], benchmarkMetrics.annualized[key]),
      ]),
    ) as Readonly<Record<AnnualizedKey, FundMetricComparisonValue>>,
    annualReturns: fundMetrics.annualReturns.map(({ value, year }) =>
      comparisonYear(
        value,
        benchmarkMetrics.annualReturns.find((row) => row.year === year)?.value ?? null,
        year,
      ),
    ),
    commonCutoffDate,
    periods: Object.fromEntries(
      periodKeys.map((key) => [
        key,
        key === 'sinceInception'
          ? comparison(fundMetrics.periods[key], null)
          : comparison(fundMetrics.periods[key], benchmarkMetrics.periods[key]),
      ]),
    ) as Readonly<Record<PeriodKey, FundMetricComparisonValue>>,
    quarterlyReturns: fundMetrics.quarterlyReturns.flatMap((fundRow) => {
      const benchmarkRow = benchmarkMetrics.quarterlyReturns.find(
        ({ year }) => year === fundRow.year,
      )
      return quarters.flatMap(({ field, quarter }) => {
        return quarterEndDate(fundRow.year, quarter) < commonCutoffDate
          ? [
              {
                ...comparison(fundRow[field], benchmarkRow?.[field] ?? null),
                quarter,
                year: fundRow.year,
              },
            ]
          : []
      })
    }),
  }
}

export function calculateRelativeReturn(
  fundReturn: number | null,
  benchmarkReturn: number | null,
): number | null {
  if (
    fundReturn === null ||
    benchmarkReturn === null ||
    !Number.isFinite(fundReturn) ||
    !Number.isFinite(benchmarkReturn) ||
    1 + benchmarkReturn <= 0
  ) {
    return null
  }
  return (1 + fundReturn) / (1 + benchmarkReturn) - 1
}

function comparison(fund: number | null, benchmark: number | null): FundMetricComparisonValue {
  return { benchmark, excess: calculateRelativeReturn(fund, benchmark), fund }
}

function comparisonYear(
  fund: number | null,
  benchmark: number | null,
  year: number,
): FundMetricComparisonYear {
  return { ...comparison(fund, benchmark), year }
}

function validFundPoints(
  source: readonly FundReinvestedNavPoint[],
): readonly FundReinvestedNavPoint[] {
  return source
    .filter(
      ({ date, reinvestedNetValue }) =>
        isIsoDate(date) && Number.isFinite(reinvestedNetValue) && reinvestedNetValue > 0,
    )
    .sort((left, right) => left.date.localeCompare(right.date))
}

function validBenchmarkPoints(
  source: readonly IndexPerformancePoint[],
): readonly IndexPerformancePoint[] {
  return source
    .filter(({ date, value }) => isIsoDate(date) && Number.isFinite(value) && value > 0)
    .sort((left, right) => left.date.localeCompare(right.date))
}

function latestCommonDate(
  fundPoints: readonly FundReinvestedNavPoint[],
  benchmarkDates: ReadonlySet<string>,
): string | undefined {
  for (let index = fundPoints.length - 1; index >= 0; index -= 1) {
    const date = fundPoints[index]?.date
    if (date && benchmarkDates.has(date)) return date
  }
  return undefined
}

function quarterEndDate(year: number, quarter: 1 | 2 | 3 | 4): string {
  return new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10)
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
