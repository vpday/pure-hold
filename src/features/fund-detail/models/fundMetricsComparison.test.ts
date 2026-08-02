import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundReinvestedNavPoint } from '@/domains/funds/models/fundReinvestedNav.ts'
import type { IndexPerformancePoint } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { calculateFundMetricsComparison, calculateRelativeReturn } from './fundMetricsComparison.ts'

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
  assert.equal(result.periods.sinceInception.benchmark, null)
  assert.equal(result.periods.sinceInception.excess, null)
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

test('keeps a benchmark result when the fund period is unavailable', () => {
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
  assertClose(result.periods.oneWeek.benchmark, 1050 / 1010 - 1)
  assert.equal(result.periods.oneWeek.excess, null)
})

test('retains every completed fund year even without benchmark coverage', () => {
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
    [2005, 2004, 2003, 2002],
  )
  assert.equal(result.annualReturns.find(({ year }) => year === 2003)?.benchmark, null)
  assertClose(result.annualReturns.find(({ year }) => year === 2005)?.benchmark ?? null, 0.1)
})

test('rejects series without an exact common date', () => {
  assert.throws(
    () =>
      calculateFundMetricsComparison(fund([['2026-07-30', 1]]), benchmark([['2026-07-31', 1000]])),
    /no common performance date/,
  )
})

test('returns relative growth and rejects unavailable or invalid benchmark growth', () => {
  assertClose(calculateRelativeReturn(0.2, 0.1), 1.2 / 1.1 - 1)
  assert.equal(calculateRelativeReturn(null, 0.1), null)
  assert.equal(calculateRelativeReturn(0.1, null), null)
  assert.equal(calculateRelativeReturn(0.1, -1), null)
})

type Value = readonly [date: string, value: number]

function fund(values: readonly Value[]): readonly FundReinvestedNavPoint[] {
  return values.map(([date, value]) => ({ date, reinvestedNetValue: value, unitNetValue: value }))
}

function benchmark(values: readonly Value[]): readonly IndexPerformancePoint[] {
  return values.map(([date, value]) => ({ date, value }))
}

function assertClose(actual: number | null, expected: number): void {
  assert.ok(actual !== null)
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}
