import type { ReturnMetricPoint } from './fundReturnMetrics.ts'
import { calculateDrawdownPath } from './drawdownPath.ts'

export const fundRiskPeriodKeys = [
  'oneYear',
  'twoYears',
  'threeYears',
  'fiveYears',
  'sinceInception',
] as const
export const minimumReturnsPerFullYear = 200

export type FundRiskPeriodKey = (typeof fundRiskPeriodKeys)[number]

export interface FundRiskAssumptions {
  readonly riskFreeAnnualRate: number
  readonly targetAnnualRate: number
}

export type FundRiskQualityIssue =
  | 'excessive-gap'
  | 'insufficient-coverage'
  | 'insufficient-observations'
  | 'source-incomplete'

export interface FundRiskPeriodMetrics {
  readonly annualizedReturn: number | null
  readonly annualizedVolatility: number | null
  readonly calmarRatio: number | null
  readonly maximumDrawdown: number | null
  readonly qualityIssue: FundRiskQualityIssue | null
  readonly sharpeRatio: number | null
  readonly sortinoRatio: number | null
}

interface RiskWindow {
  readonly fullYears: number | null
  readonly nominalStartDate: string
  readonly points: readonly ReturnMetricPoint[]
}

const annualizationPeriods = 252
const daysPerYear = 365.2425
const maximumConsecutiveMissingBenchmarkDates = 10
const millisecondsPerDay = 86_400_000
const minimumCoverage = 0.8
export function calculateRollingFundRiskMetrics(
  source: readonly ReturnMetricPoint[],
  expectedDates: readonly string[],
  options: {
    readonly assumptions: FundRiskAssumptions
    readonly commonCutoffDate: string
    readonly inceptionDate: string
    readonly sourceIncompletePeriods?: ReadonlySet<FundRiskPeriodKey>
  },
): Readonly<Record<FundRiskPeriodKey, FundRiskPeriodMetrics>> {
  const points = validPoints(source).filter(({ date }) => date <= options.commonCutoffDate)
  const calendar = validDates(expectedDates).filter((date) => date <= options.commonCutoffDate)
  const cutoff = parseDate(options.commonCutoffDate)

  return Object.fromEntries(
    fundRiskPeriodKeys.map((period) => {
      const fullYears = yearsForPeriod(period)
      const nominalStartDate =
        fullYears === null ? options.inceptionDate : subtractYears(cutoff, fullYears)
      const window = createWindow(points, nominalStartDate, options.commonCutoffDate, fullYears)
      return [
        period,
        calculateWindowMetrics(
          window,
          calendar,
          options.assumptions,
          options.sourceIncompletePeriods?.has(period) ?? false,
        ),
      ]
    }),
  ) as unknown as Readonly<Record<FundRiskPeriodKey, FundRiskPeriodMetrics>>
}

function calculateWindowMetrics(
  window: RiskWindow,
  expectedDates: readonly string[],
  assumptions: FundRiskAssumptions,
  sourceIncomplete: boolean,
): FundRiskPeriodMetrics {
  const start = window.points[0]
  const end = window.points.at(-1)
  const annualizedReturn = cagr(start, end)
  const returns = simpleReturns(window.points)
  const qualityIssue = assessQuality(window, expectedDates, returns.length, sourceIncomplete)
  if (qualityIssue) return emptyPathMetrics(annualizedReturn, qualityIssue)

  const maximumDrawdown = calculateMaximumDrawdown(window.points)
  const annualizedVolatility = annualizeSampleDeviation(returns)
  const riskFreeDailyRate = dailyEffectiveRate(assumptions.riskFreeAnnualRate)
  const targetDailyRate = dailyEffectiveRate(assumptions.targetAnnualRate)
  return {
    annualizedReturn,
    annualizedVolatility,
    calmarRatio:
      annualizedReturn !== null && maximumDrawdown !== null && maximumDrawdown > 0
        ? finiteOrNull(annualizedReturn / maximumDrawdown)
        : null,
    maximumDrawdown,
    qualityIssue: null,
    sharpeRatio:
      riskFreeDailyRate === null ? null : calculateSharpeRatio(returns, riskFreeDailyRate),
    sortinoRatio: targetDailyRate === null ? null : calculateSortinoRatio(returns, targetDailyRate),
  }
}

function assessQuality(
  window: RiskWindow,
  expectedDates: readonly string[],
  returnCount: number,
  sourceIncomplete: boolean,
): FundRiskQualityIssue | null {
  if (sourceIncomplete) return 'source-incomplete'
  const minimumReturns = minimumReturnsPerFullYear * (window.fullYears ?? 1)
  if (returnCount < minimumReturns) return 'insufficient-observations'

  const windowDates = new Set(window.points.map(({ date }) => date))
  for (const segment of coverageSegments(window.nominalStartDate, window.points.at(-1)?.date)) {
    const segmentExpectedDates = expectedDates.filter(
      (date) => date > segment.startDate && date <= segment.endDate,
    )
    if (segmentExpectedDates.length === 0) continue
    const covered = segmentExpectedDates.filter((date) => windowDates.has(date)).length
    if (covered / segmentExpectedDates.length < minimumCoverage) {
      return 'insufficient-coverage'
    }
  }

  const relevantExpectedDates = expectedDates.filter(
    (date) => date >= window.nominalStartDate && date <= (window.points.at(-1)?.date ?? ''),
  )
  let currentGap = 0
  let longestGap = 0
  for (const date of relevantExpectedDates) {
    currentGap = windowDates.has(date) ? 0 : currentGap + 1
    longestGap = Math.max(longestGap, currentGap)
  }
  return longestGap > maximumConsecutiveMissingBenchmarkDates ? 'excessive-gap' : null
}

function createWindow(
  points: readonly ReturnMetricPoint[],
  nominalStartDate: string,
  cutoffDate: string,
  fullYears: number | null,
): RiskWindow {
  const start = findPointAtOrBefore(points, nominalStartDate)
  return {
    fullYears,
    nominalStartDate,
    points: start ? points.filter(({ date }) => date >= start.date && date <= cutoffDate) : [],
  }
}

function coverageSegments(
  nominalStartDate: string,
  cutoffDate: string | undefined,
): readonly { readonly endDate: string; readonly startDate: string }[] {
  if (!cutoffDate || nominalStartDate >= cutoffDate) return []
  const segments: Array<{ endDate: string; startDate: string }> = []
  let endDate = cutoffDate
  while (endDate > nominalStartDate) {
    const previousYear = subtractYears(parseDate(endDate), 1)
    const startDate = previousYear > nominalStartDate ? previousYear : nominalStartDate
    segments.push({ endDate, startDate })
    endDate = startDate
  }
  return segments
}

function calculateMaximumDrawdown(points: readonly ReturnMetricPoint[]): number | null {
  const maximumDrawdown = calculateDrawdownPath(points).maximumDrawdown
  return maximumDrawdown === null ? null : Math.abs(maximumDrawdown)
}

function annualizeSampleDeviation(values: readonly number[]): number | null {
  const deviation = sampleDeviation(values)
  return deviation === null ? null : finiteOrNull(deviation * Math.sqrt(annualizationPeriods))
}

function calculateSharpeRatio(returns: readonly number[], dailyRate: number): number | null {
  const excessReturns = returns.map((value) => value - dailyRate)
  const deviation = sampleDeviation(excessReturns)
  if (deviation === null || deviation === 0) return null
  return finiteOrNull((mean(excessReturns) / deviation) * Math.sqrt(annualizationPeriods))
}

function calculateSortinoRatio(returns: readonly number[], dailyRate: number): number | null {
  if (returns.length === 0) return null
  const excessReturns = returns.map((value) => value - dailyRate)
  const downsideDeviation = Math.sqrt(
    excessReturns.reduce((total, value) => total + Math.min(value, 0) ** 2, 0) /
      excessReturns.length,
  )
  if (!Number.isFinite(downsideDeviation) || downsideDeviation === 0) return null
  return finiteOrNull((mean(excessReturns) / downsideDeviation) * Math.sqrt(annualizationPeriods))
}

function sampleDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null
  const average = mean(values)
  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1)
  return finiteOrNull(Math.sqrt(variance))
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function simpleReturns(points: readonly ReturnMetricPoint[]): readonly number[] {
  const returns: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    const value = points[index]!.value / points[index - 1]!.value - 1
    if (Number.isFinite(value)) returns.push(value)
  }
  return returns
}

function dailyEffectiveRate(annualRate: number): number | null {
  return Number.isFinite(annualRate) && annualRate > -1
    ? finiteOrNull(Math.pow(1 + annualRate, 1 / annualizationPeriods) - 1)
    : null
}

function cagr(
  start: ReturnMetricPoint | undefined,
  end: ReturnMetricPoint | undefined,
): number | null {
  if (!start || !end || start.date >= end.date) return null
  const days =
    (parseDate(end.date).getTime() - parseDate(start.date).getTime()) / millisecondsPerDay
  return days < 365 ? null : finiteOrNull(Math.pow(end.value / start.value, daysPerYear / days) - 1)
}

function findPointAtOrBefore(
  points: readonly ReturnMetricPoint[],
  date: string,
): ReturnMetricPoint | undefined {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index]!.date <= date) return points[index]
  }
  return undefined
}

function validPoints(source: readonly ReturnMetricPoint[]): readonly ReturnMetricPoint[] {
  return source
    .filter(({ date, value }) => isDate(date) && Number.isFinite(value) && value > 0)
    .sort((left, right) => left.date.localeCompare(right.date))
}

function validDates(source: readonly string[]): readonly string[] {
  return [...new Set(source.filter(isDate))].sort()
}

function yearsForPeriod(period: FundRiskPeriodKey): number | null {
  if (period === 'sinceInception') return null
  if (period === 'oneYear') return 1
  if (period === 'twoYears') return 2
  if (period === 'threeYears') return 3
  return 5
}

function emptyPathMetrics(
  annualizedReturn: number | null,
  qualityIssue: FundRiskQualityIssue,
): FundRiskPeriodMetrics {
  return {
    annualizedReturn,
    annualizedVolatility: null,
    calmarRatio: null,
    maximumDrawdown: null,
    qualityIssue,
    sharpeRatio: null,
    sortinoRatio: null,
  }
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null
}

function subtractYears(date: Date, years: number): string {
  const year = date.getUTCFullYear() - years
  const month = date.getUTCMonth()
  return formatDate(utcDate(year, month, Math.min(date.getUTCDate(), daysInMonth(year, month))))
}

function daysInMonth(year: number, month: number): number {
  return utcDate(year, month + 1, 0).getUTCDate()
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return utcDate(year!, month! - 1, day!)
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day))
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && formatDate(parseDate(value)) === value
}
