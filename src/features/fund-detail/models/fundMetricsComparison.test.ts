import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundReinvestedNavPoint } from '@/domains/funds/models/fundReinvestedNav.ts'
import type {
  IndexPerformanceHistory,
  IndexPerformanceHistoryIssueCode,
  IndexPerformancePoint,
} from '@/domains/indices/models/indexPerformanceHistory.ts'
import {
  calculateFundMetricsComparison,
  calculateFundRiskMetricsComparison,
  calculateRelativeReturn,
} from './fundMetricsComparison.ts'

test('uses the latest exact common date and relative excess return', () => {
  const result = calculateFundMetricsComparison(
    fund([
      ['2024-12-31', 1],
      ['2025-03-31', 1.1],
      ['2025-06-30', 1.2],
      ['2025-07-31', 1.4],
    ]),
    benchmark([
      ['2024-12-31', 1000],
      ['2025-03-31', 1050],
      ['2025-06-30', 1100],
      ['2025-08-01', 1200],
    ]),
  )

  assert.equal(result.commonCutoffDate, '2025-06-30')
  assertClose(result.periods.yearToDate.fund, 0.2)
  assertClose(result.periods.yearToDate.benchmark, 0.1)
  assertClose(result.periods.yearToDate.excess, 1.2 / 1.1 - 1)
  assertClose(result.periods.sinceInception.fund, 0.2)
  assertClose(result.periods.sinceInception.benchmark, 0.1)
  assertClose(result.periods.sinceInception.excess, 1.2 / 1.1 - 1)
  assert.equal(result.quarterlyReturns[0]?.quarter, 1)
})

test('uses the previous common trading day when the fund already has current-day data', () => {
  const result = calculateFundMetricsComparison(
    fund([
      ['2026-07-30', 1],
      ['2026-07-31', 1.1],
      ['2026-08-01', 1.2],
    ]),
    benchmark([
      ['2026-07-30', 1000],
      ['2026-07-31', 1100],
    ]),
  )

  assert.equal(result.commonCutoffDate, '2026-07-31')
})

test('uses only exact common dates for both sides of every period', () => {
  const result = calculateFundMetricsComparison(
    fund([
      ['2025-06-25', 1],
      ['2025-06-30', 1.1],
    ]),
    benchmark([
      ['2025-06-20', 1000],
      ['2025-06-23', 1010],
      ['2025-06-30', 1050],
    ]),
  )

  assert.equal(result.periods.oneWeek.fund, null)
  assert.equal(result.periods.oneWeek.benchmark, null)
  assert.equal(result.periods.oneWeek.excess, null)
})

test('retains only completed years present in the exact common date series', () => {
  const result = calculateFundMetricsComparison(
    fund([
      ['2002-12-31', 1],
      ['2003-12-31', 1.1],
      ['2004-12-31', 1.2],
      ['2005-12-31', 1.3],
      ['2006-01-04', 1.31],
    ]),
    benchmark([
      ['2004-12-31', 1000],
      ['2005-12-31', 1100],
      ['2006-01-04', 1110],
    ]),
  )

  assert.deepEqual(
    result.annualReturns.map(({ year }) => year),
    [2005, 2004],
  )
  assertClose(result.annualReturns.find(({ year }) => year === 2005)?.benchmark ?? null, 0.1)
})

test('rejects series without an exact common date', () => {
  assert.throws(
    () =>
      calculateFundMetricsComparison(fund([['2026-07-30', 1]]), benchmark([['2026-07-31', 1000]])),
    /no common performance date/,
  )
})

test('keeps the existing mixed risk contract when no dates are common', () => {
  const dates = weekdays('2020-01-01', '2026-01-02')
  const result = calculateFundRiskMetricsComparison(
    fund([['2019-01-01', 100]]),
    benchmarkHistory(dates.map((date, index) => [date, 1000 + index])),
    '2026-01-02',
    { riskFreeAnnualRate: 0, targetAnnualRate: 0 },
  )

  assert.equal(result.periods.oneYear.maximumDrawdown.fund, null)
  assert.ok(result.periods.oneYear.maximumDrawdown.benchmark !== null)
})

test('returns relative growth and rejects unavailable or invalid benchmark growth', () => {
  assertClose(calculateRelativeReturn(0.2, 0.1), 1.2 / 1.1 - 1)
  assert.equal(calculateRelativeReturn(null, 0.1), null)
  assert.equal(calculateRelativeReturn(0.1, null), null)
  assert.equal(calculateRelativeReturn(0.1, -1), null)
})

test('keeps relative excess returns unchanged and uses simple subtraction for risk differences', () => {
  const dates = weekdays('2020-01-01', '2026-01-02')
  const fundPoints = fund(dates.map((date, index) => [date, 100 * Math.pow(1.0004, index)]))
  const history = benchmarkHistory(
    dates.map((date, index) => [date, 1000 * Math.pow(1.0003, index)]),
  )
  const returns = calculateFundMetricsComparison(fundPoints, history.points)
  const risk = calculateFundRiskMetricsComparison(fundPoints, history, returns.commonCutoffDate, {
    riskFreeAnnualRate: 0.0115,
    targetAnnualRate: 0.04,
  })

  assertClose(
    returns.periods.oneYear.excess,
    (1 + returns.periods.oneYear.fund!) / (1 + returns.periods.oneYear.benchmark!) - 1,
  )
  assertClose(
    risk.periods.oneYear.maximumDrawdown.difference,
    risk.periods.oneYear.maximumDrawdown.fund! - risk.periods.oneYear.maximumDrawdown.benchmark!,
  )
})

test('aligns benchmark since-inception risk to the first fund date', () => {
  const dates = weekdays('2018-01-01', '2026-01-02')
  const fundDates = dates.filter((date) => date >= '2022-01-03')
  const result = calculateFundRiskMetricsComparison(
    fund(fundDates.map((date, index) => [date, 100 + Math.sin(index / 10)])),
    benchmarkHistory(dates.map((date, index) => [date, 1000 + Math.sin(index / 10)])),
    '2026-01-02',
    { riskFreeAnnualRate: 0, targetAnnualRate: 0 },
  )

  assert.equal(result.periods.sinceInception.quality, null)
  assert.ok(result.periods.sinceInception.maximumDrawdown.benchmark !== null)
})

test('explains when the fund has not existed for the selected risk period', () => {
  const benchmarkDates = weekdays('2021-07-30', '2026-07-31')
  const fundDates = benchmarkDates.filter((date) => date >= '2021-10-28')
  const result = calculateFundRiskMetricsComparison(
    fund(fundDates.map((date, index) => [date, 100 + Math.sin(index / 10)])),
    benchmarkHistory(benchmarkDates.map((date, index) => [date, 1000 + Math.sin(index / 10)])),
    '2026-07-31',
    { riskFreeAnnualRate: 0, targetAnnualRate: 0 },
  )

  assert.deepEqual(result.periods.fiveYears.quality, {
    kind: 'fund-history-too-short',
    requiredYears: 5,
  })
  assert.equal(result.periods.threeYears.quality, null)
})

test('treats a young fund inception window as one short comparison window', () => {
  const dates = weekdays('2025-11-17', '2026-07-31')
  const result = calculateFundRiskMetricsComparison(
    fund(dates.map((date, index) => [date, 1 + index * 0.001])),
    benchmarkHistory([
      ['2004-12-31', 1000],
      ...dates.map((date, index) => [date, 2000 + index] as const),
    ]),
    '2026-07-31',
    { riskFreeAnnualRate: 0, targetAnnualRate: 0 },
  )

  assert.deepEqual(result.periods.sinceInception.quality, {
    kind: 'comparison-window-too-short',
    minimumReturns: 200,
  })
})

test('keeps the valid side when one path is incomplete and maps benchmark issue scopes', () => {
  const dates = weekdays('2020-01-01', '2026-01-02')
  const fundPoints = fund(dates.map((date, index) => [date, 100 + Math.sin(index / 10)]))
  const malformed = calculateFundRiskMetricsComparison(
    fundPoints,
    benchmarkHistory(
      dates.map((date, index) => [date, 1000 + Math.sin(index / 8)]),
      ['malformed-record'],
    ),
    '2026-01-02',
    { riskFreeAnnualRate: 0, targetAnnualRate: 0 },
  )
  assert.ok(malformed.periods.oneYear.maximumDrawdown.fund !== null)
  assert.equal(malformed.periods.oneYear.maximumDrawdown.benchmark, null)
  assert.equal(malformed.periods.oneYear.maximumDrawdown.difference, null)

  const missingStart = calculateFundRiskMetricsComparison(
    fundPoints,
    benchmarkHistory(
      dates.map((date, index) => [date, 1000 + Math.sin(index / 8)]),
      ['missing-start-date', 'duplicate-date'],
    ),
    '2026-01-02',
    { riskFreeAnnualRate: 0, targetAnnualRate: 0 },
  )
  assert.equal(missingStart.periods.oneYear.quality, null)
  assert.deepEqual(missingStart.periods.sinceInception.quality, {
    benchmarkIssue: 'source-incomplete',
    fundIssue: null,
    kind: 'history-incomplete',
  })
})

type Value = readonly [date: string, value: number]

function fund(values: readonly Value[]): readonly FundReinvestedNavPoint[] {
  return values.map(([date, value]) => ({ date, reinvestedNetValue: value, unitNetValue: value }))
}

function benchmark(values: readonly Value[]): readonly IndexPerformancePoint[] {
  return values.map(([date, value]) => ({ date, value }))
}

function benchmarkHistory(
  values: readonly Value[],
  issueCodes: readonly IndexPerformanceHistoryIssueCode[] = [],
): IndexPerformanceHistory {
  return {
    endDate: values.at(-1)?.[0] ?? '2026-01-02',
    indexCode: 'H00300',
    indexName: '沪深300全收益指数',
    issues: issueCodes.map((code) => ({ code, count: 1 })),
    points: benchmark(values),
    startDate: '20041231',
  }
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

function assertClose(actual: number | null, expected: number): void {
  assert.ok(actual !== null)
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}
