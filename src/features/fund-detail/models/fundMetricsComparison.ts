import type { FundReinvestedNavPoint } from '@/domains/funds/models/fundReinvestedNav.ts'
import {
  calculateFundReturnMetrics,
  calculateReturnMetrics,
  type FundReturnMetrics,
} from '@/domains/funds/models/fundReturnMetrics.ts'
import {
  calculateRollingFundRiskMetrics,
  fundRiskPeriodKeys,
  minimumReturnsPerFullYear,
  type FundRiskAssumptions,
  type FundRiskPeriodKey,
  type FundRiskPeriodMetrics,
  type FundRiskQualityIssue,
} from '@/domains/funds/models/fundRiskMetrics.ts'
import type {
  IndexPerformanceHistory,
  IndexPerformancePoint,
} from '@/domains/indices/models/indexPerformanceHistory.ts'
import { alignFundBenchmarkTimeSeries } from './fundBenchmarkTimeSeriesAlignment.ts'

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

export interface FundRiskMetricComparisonValue {
  readonly benchmark: number | null
  readonly difference: number | null
  readonly fund: number | null
}

export interface FundRiskPeriodComparison {
  readonly annualizedVolatility: FundRiskMetricComparisonValue
  readonly calmarRatio: FundRiskMetricComparisonValue
  readonly maximumDrawdown: FundRiskMetricComparisonValue
  readonly quality: FundRiskPeriodQuality | null
  readonly sharpeRatio: FundRiskMetricComparisonValue
  readonly sortinoRatio: FundRiskMetricComparisonValue
}

export type FundRiskPeriodQuality =
  | {
      readonly kind: 'comparison-window-too-short'
      readonly minimumReturns: number
    }
  | {
      readonly kind: 'fund-history-too-short'
      readonly requiredYears: number
    }
  | {
      readonly benchmarkIssue: FundRiskQualityIssue | null
      readonly fundIssue: FundRiskQualityIssue | null
      readonly kind: 'history-incomplete'
    }

export interface FundRiskMetricsComparison {
  readonly periods: Readonly<Record<FundRiskPeriodKey, FundRiskPeriodComparison>>
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

const riskPeriodYears: Readonly<Record<FundRiskPeriodKey, number | null>> = {
  fiveYears: 5,
  oneYear: 1,
  sinceInception: null,
  threeYears: 3,
  twoYears: 2,
}

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
  const aligned = alignFundBenchmarkTimeSeries(fundSource, benchmarkSource)
  const { commonCutoffDate } = aligned
  if (!commonCutoffDate) throw new Error('Fund and benchmark have no common performance date')

  const fundMetrics = calculateFundReturnMetrics(
    aligned.commonPoints.map(({ fundPoint }) => fundPoint),
  )
  const benchmarkMetrics = calculateReturnMetrics(
    aligned.commonPoints.map(({ benchmarkPoint }) => benchmarkPoint),
  )

  return {
    annualized: Object.fromEntries(
      annualizedKeys.map((key) => [
        key,
        comparison(fundMetrics.annualized[key], benchmarkMetrics.annualized[key]),
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
        comparison(fundMetrics.periods[key], benchmarkMetrics.periods[key]),
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

export function calculateFundRiskMetricsComparison(
  fundSource: readonly FundReinvestedNavPoint[],
  benchmarkHistory: IndexPerformanceHistory,
  commonCutoffDate: string,
  assumptions: FundRiskAssumptions,
): FundRiskMetricsComparison {
  const aligned = alignFundBenchmarkTimeSeries(fundSource, benchmarkHistory.points)
  const effectiveCutoffDate = aligned.commonCutoffDate
    ? aligned.commonCutoffDate < commonCutoffDate
      ? aligned.commonCutoffDate
      : commonCutoffDate
    : commonCutoffDate
  const fundPoints = aligned.commonPoints.length
    ? aligned.commonPoints
        .filter(({ date }) => date <= effectiveCutoffDate)
        .map(({ fundPoint }) => fundPoint)
    : aligned.fundPoints.filter(({ date }) => date <= effectiveCutoffDate)
  const benchmarkPoints = aligned.commonPoints.length
    ? aligned.commonPoints
        .filter(({ date }) => date <= effectiveCutoffDate)
        .map(({ benchmarkPoint }) => benchmarkPoint)
    : aligned.benchmarkPoints.filter(({ date }) => date <= effectiveCutoffDate)
  const inceptionDate = fundPoints[0]?.date ?? commonCutoffDate
  const expectedDates = aligned.benchmarkPoints
    .filter(({ date }) => date <= effectiveCutoffDate)
    .map(({ date }) => date)
  const fundMetrics = calculateRollingFundRiskMetrics(
    fundPoints.map(({ date, reinvestedNetValue: value }) => ({ date, value })),
    expectedDates,
    { assumptions, commonCutoffDate: effectiveCutoffDate, inceptionDate },
  )
  const benchmarkMetrics = calculateRollingFundRiskMetrics(benchmarkPoints, expectedDates, {
    assumptions,
    commonCutoffDate: effectiveCutoffDate,
    inceptionDate,
    sourceIncompletePeriods: benchmarkIncompletePeriods(benchmarkHistory),
  })

  return {
    periods: Object.fromEntries(
      fundRiskPeriodKeys.map((period) => {
        const fullYears = riskPeriodYears[period]
        const fundMetric = fundMetrics[period]
        const benchmarkMetric = benchmarkMetrics[period]
        const quality =
          period === 'sinceInception' &&
          fundMetric.qualityIssue === 'insufficient-observations' &&
          benchmarkMetric.qualityIssue === 'insufficient-observations'
            ? ({
                kind: 'comparison-window-too-short',
                minimumReturns: minimumReturnsPerFullYear,
              } as const)
            : fullYears !== null &&
                fundMetric.qualityIssue !== null &&
                (benchmarkMetric.qualityIssue === null ||
                  benchmarkMetric.qualityIssue === 'insufficient-observations') &&
                !hasFullYearsHistory(inceptionDate, commonCutoffDate, fullYears)
              ? ({ kind: 'fund-history-too-short', requiredYears: fullYears } as const)
              : fundMetric.qualityIssue || benchmarkMetric.qualityIssue
                ? ({
                    benchmarkIssue: benchmarkMetric.qualityIssue,
                    fundIssue: fundMetric.qualityIssue,
                    kind: 'history-incomplete',
                  } as const)
                : null
        return [period, riskPeriodComparison(fundMetric, benchmarkMetric, quality)]
      }),
    ) as Readonly<Record<FundRiskPeriodKey, FundRiskPeriodComparison>>,
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

function riskPeriodComparison(
  fund: FundRiskPeriodMetrics,
  benchmark: FundRiskPeriodMetrics,
  quality: FundRiskPeriodQuality | null,
): FundRiskPeriodComparison {
  return {
    annualizedVolatility: riskComparison(fund.annualizedVolatility, benchmark.annualizedVolatility),
    calmarRatio: riskComparison(fund.calmarRatio, benchmark.calmarRatio),
    maximumDrawdown: riskComparison(fund.maximumDrawdown, benchmark.maximumDrawdown),
    quality,
    sharpeRatio: riskComparison(fund.sharpeRatio, benchmark.sharpeRatio),
    sortinoRatio: riskComparison(fund.sortinoRatio, benchmark.sortinoRatio),
  }
}

function riskComparison(fund: number | null, benchmark: number | null) {
  return {
    benchmark,
    difference:
      fund !== null && benchmark !== null && Number.isFinite(fund) && Number.isFinite(benchmark)
        ? fund - benchmark
        : null,
    fund,
  }
}

function hasFullYearsHistory(startDate: string, endDate: string, fullYears: number): boolean {
  const anniversary = new Date(`${startDate}T00:00:00.000Z`)
  const startMonth = anniversary.getUTCMonth()
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + fullYears)
  if (anniversary.getUTCMonth() !== startMonth) anniversary.setUTCDate(0)
  return anniversary.getTime() <= Date.parse(`${endDate}T00:00:00.000Z`)
}

function benchmarkIncompletePeriods(
  history: IndexPerformanceHistory,
): ReadonlySet<FundRiskPeriodKey> {
  const issueCodes = new Set(history.issues.map(({ code }) => code))
  if (issueCodes.has('malformed-record')) return new Set(fundRiskPeriodKeys)
  return issueCodes.has('missing-start-date')
    ? new Set<FundRiskPeriodKey>(['sinceInception'])
    : new Set()
}

function quarterEndDate(year: number, quarter: 1 | 2 | 3 | 4): string {
  return new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10)
}
