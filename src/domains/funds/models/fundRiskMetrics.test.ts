import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateReturnMetrics, type ReturnMetricPoint } from './fundReturnMetrics.ts'
import {
  calculateRollingFundRiskMetrics,
  type FundRiskAssumptions,
  type FundRiskPeriodKey,
} from './fundRiskMetrics.ts'

const assumptions: FundRiskAssumptions = {
  riskFreeAnnualRate: 0.0115,
  targetAnnualRate: 0.04,
}

test('calculates complete rolling windows and aligns since inception to the supplied date', () => {
  const dates = weekdays('2020-01-01', '2026-01-02')
  const points = values(dates, (_, index) => 100 * Math.pow(1.0003, index))
  const metrics = calculate(points, dates, '2026-01-02', '2020-06-01')

  for (const period of ['oneYear', 'twoYears', 'threeYears', 'fiveYears'] as const) {
    assert.equal(metrics[period].qualityIssue, null)
    assert.ok(metrics[period].annualizedVolatility !== null)
  }
  const expectedSinceInception = calculateReturnMetrics(
    points.filter(({ date }) => date >= '2020-06-01'),
  ).annualized.sinceInception
  assertClose(metrics.sinceInception.annualizedReturn, expectedSinceInception)
})

test('clamps leap-day year subtraction and uses the point before a missing target date', () => {
  const dates = weekdays('2023-02-27', '2024-02-29').filter((date) => date !== '2023-02-28')
  const points = values(dates, (_, index) => 100 + index)
  const metrics = calculate(points, dates, '2024-02-29', '2023-02-27')

  assert.equal(metrics.oneYear.qualityIssue, null)
  assertClose(
    metrics.oneYear.annualizedReturn,
    calculateReturnMetrics(points).annualized.sinceInception,
  )
})

test('uses simple adjacent returns, sample deviation and 252-period annualization', () => {
  const dates = weekdays('2024-01-01', '2025-01-02')
  const dailyReturns = dates.slice(1).map((_, index) => (index % 2 === 0 ? 0.01 : -0.005))
  const points = pathFromReturns(dates, dailyReturns)
  const metrics = calculate(points, dates, '2025-01-02', '2024-01-01', {
    riskFreeAnnualRate: 0,
    targetAnnualRate: 0,
  }).sinceInception
  const average = mean(dailyReturns)
  const sampleVariance =
    dailyReturns.reduce((total, value) => total + (value - average) ** 2, 0) /
    (dailyReturns.length - 1)

  assertClose(metrics.annualizedVolatility, Math.sqrt(sampleVariance) * Math.sqrt(252))
  assertClose(metrics.sharpeRatio, (average / Math.sqrt(sampleVariance)) * Math.sqrt(252))
  const downside = Math.sqrt(
    dailyReturns.reduce((total, value) => total + Math.min(value, 0) ** 2, 0) / dailyReturns.length,
  )
  assertClose(metrics.sortinoRatio, (average / downside) * Math.sqrt(252))
})

test('uses compounded negative annual assumptions and does not fill missing dates', () => {
  const dates = weekdays('2024-01-01', '2025-01-02')
  const retainedDates = dates.filter((_, index) => index !== 100)
  const points = values(retainedDates, (_, index) => 100 * Math.pow(1.0002, index))
  const negative = { riskFreeAnnualRate: -0.01, targetAnnualRate: -0.02 }
  const metrics = calculate(points, dates, '2025-01-02', '2024-01-01', negative).oneYear

  assert.equal(metrics.qualityIssue, null)
  assert.ok(metrics.sharpeRatio !== null)
  assert.ok(metrics.sortinoRatio === null || Number.isFinite(metrics.sortinoRatio))
})

test('returns a positive maximum drawdown and a negative Calmar ratio for a losing path', () => {
  const dates = weekdays('2024-01-01', '2025-01-02')
  const points = values(dates, (_, index) => (index < 50 ? 100 + index : 149 - index * 0.25))
  const metrics = calculate(points, dates, '2025-01-02', '2024-01-01').oneYear

  assert.ok((metrics.maximumDrawdown ?? 0) > 0)
  assert.ok((metrics.annualizedReturn ?? 0) < 0)
  assert.ok((metrics.calmarRatio ?? 0) < 0)
})

test('returns null ratios for zero drawdown, volatility and downside deviation', () => {
  const dates = weekdays('2024-01-01', '2025-01-02')
  const flat = calculate(
    values(dates, () => 100),
    dates,
    '2025-01-02',
    '2024-01-01',
    {
      riskFreeAnnualRate: 0,
      targetAnnualRate: 0,
    },
  ).oneYear
  const rising = calculate(
    values(dates, (_, index) => 100 + index),
    dates,
    '2025-01-02',
    '2024-01-01',
    { riskFreeAnnualRate: 0, targetAnnualRate: 0 },
  ).oneYear

  assert.equal(flat.calmarRatio, null)
  assert.equal(flat.maximumDrawdown, 0)
  assert.equal(flat.sharpeRatio, null)
  assert.equal(flat.sortinoRatio, null)
  assert.equal(rising.calmarRatio, null)
  assert.equal(rising.maximumDrawdown, 0)
  assert.equal(rising.sortinoRatio, null)
})

test('enforces minimum observations while preserving endpoint CAGR', () => {
  const dates = weekdays('2024-01-01', '2025-01-02').slice(0, 200)
  const points = values(dates, (_, index) => 100 + index)
  const metrics = calculate(points, dates, dates.at(-1)!, dates[0]!).oneYear

  assert.equal(metrics.qualityIssue, 'insufficient-observations')
  assert.equal(metrics.maximumDrawdown, null)
  assert.ok(metrics.annualizedReturn === null || Number.isFinite(metrics.annualizedReturn))
})

test('accepts exactly 80 percent coverage and rejects a lower annual segment', () => {
  const dates = weekdays('2024-01-01', '2025-02-01').slice(0, 251)
  const exactlyEighty = dates.filter((_, index) => index === 0 || index % 5 !== 0)
  const belowEighty = [...exactlyEighty.slice(0, 100), '2024-06-15', ...exactlyEighty.slice(101)]

  assert.equal(
    calculate(
      values(exactlyEighty, (_, index) => 100 + index),
      dates,
      dates.at(-1)!,
      dates[0]!,
    ).sinceInception.qualityIssue,
    null,
  )
  assert.equal(
    calculate(
      values(belowEighty, (_, index) => 100 + index),
      dates,
      dates.at(-1)!,
      dates[0]!,
    ).sinceInception.qualityIssue,
    'insufficient-coverage',
  )
})

test('allows ten consecutive missing benchmark dates and rejects eleven', () => {
  const dates = weekdays('2024-01-01', '2025-01-02')
  const removeGap = (length: number) =>
    dates.filter((_, index) => index < 100 || index >= 100 + length)
  const ten = removeGap(10)
  const eleven = removeGap(11)

  assert.equal(
    calculate(
      values(ten, (_, index) => 100 + index),
      dates,
      '2025-01-02',
      '2024-01-01',
    ).oneYear.qualityIssue,
    null,
  )
  assert.equal(
    calculate(
      values(eleven, (_, index) => 100 + index),
      dates,
      '2025-01-02',
      '2024-01-01',
    ).oneYear.qualityIssue,
    'excessive-gap',
  )
})

test('checks the earliest partial inception segment and source completeness', () => {
  const dates = weekdays('2023-06-01', '2025-01-02')
  const sparseStart = dates.filter((date, index) => date >= '2024-01-02' || index % 2 === 0)
  const metrics = calculate(
    values(sparseStart, (_, index) => 100 + index),
    dates,
    '2025-01-02',
    '2023-06-01',
  )
  assert.equal(metrics.sinceInception.qualityIssue, 'insufficient-coverage')

  const incomplete = calculate(
    values(dates, (_, index) => 100 + index),
    dates,
    '2025-01-02',
    '2023-06-01',
    assumptions,
    new Set<FundRiskPeriodKey>(['oneYear']),
  )
  assert.equal(incomplete.oneYear.qualityIssue, 'source-incomplete')
  assert.equal(incomplete.threeYears.qualityIssue, 'insufficient-observations')
})

test('filters non-finite points and produces the same result for shuffled input', () => {
  const dates = weekdays('2024-01-01', '2025-01-02')
  const points: ReturnMetricPoint[] = [
    ...values(dates, (_, index) => 100 + Math.sin(index / 10)),
    { date: 'invalid', value: 100 },
    { date: '2024-04-01', value: Number.NaN },
  ]
  const shuffled = [...points].sort((left, right) => right.date.localeCompare(left.date))

  assert.deepEqual(
    calculate(points, dates, '2025-01-02', '2024-01-01'),
    calculate(shuffled, [...dates].reverse(), '2025-01-02', '2024-01-01'),
  )
})

test('keeps the first valid point when a risk date is duplicated', () => {
  const dates = weekdays('2024-01-01', '2025-01-02')
  const points = [...values(dates, () => 100), { date: '2024-01-02', value: 200 }]

  assert.equal(
    calculate(points, dates, '2025-01-02', '2024-01-01').sinceInception.maximumDrawdown,
    0,
  )
})

function calculate(
  points: readonly ReturnMetricPoint[],
  expectedDates: readonly string[],
  commonCutoffDate: string,
  inceptionDate: string,
  selectedAssumptions = assumptions,
  sourceIncompletePeriods?: ReadonlySet<FundRiskPeriodKey>,
) {
  return calculateRollingFundRiskMetrics(points, expectedDates, {
    assumptions: selectedAssumptions,
    commonCutoffDate,
    inceptionDate,
    sourceIncompletePeriods,
  })
}

function weekdays(startDate: string, endDate: string): readonly string[] {
  const dates: string[] = []
  const current = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  while (current <= end) {
    if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) {
      dates.push(current.toISOString().slice(0, 10))
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

function values(
  dates: readonly string[],
  valueAt: (date: string, index: number) => number,
): readonly ReturnMetricPoint[] {
  return dates.map((date, index) => ({ date, value: valueAt(date, index) }))
}

function pathFromReturns(
  dates: readonly string[],
  returns: readonly number[],
): readonly ReturnMetricPoint[] {
  let value = 100
  return dates.map((date, index) => {
    if (index > 0) value *= 1 + returns[index - 1]!
    return { date, value }
  })
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function assertClose(actual: number | null, expected: number | null): void {
  assert.ok(actual !== null)
  assert.ok(expected !== null)
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`)
}
