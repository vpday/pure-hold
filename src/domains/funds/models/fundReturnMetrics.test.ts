import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundReinvestedNavPoint } from './fundReinvestedNav.ts'
import { calculateFundReturnMetrics, calculateReturnMetrics } from './fundReturnMetrics.ts'

test('uses the same calculator for a generic positive-value series', () => {
  const points = [
    { date: '2024-12-31', value: 1000 },
    { date: '2025-12-31', value: 1120 },
    { date: '2026-01-15', value: 1100 },
  ]

  assert.deepEqual(
    calculateReturnMetrics(points),
    calculateFundReturnMetrics(points.map(({ date, value }) => point(date, value))),
  )
})

test('uses the latest point and falls back to the last point before each target date', () => {
  const metrics = calculateFundReturnMetrics([
    point('2024-12-31', 1),
    point('2025-06-27', 1.1),
    point('2025-06-30', 1.2),
    point('2025-07-25', 1.3),
    point('2025-08-01', 1.4),
  ])
  assert.equal(metrics.cutoffDate, '2025-08-01')
  assertClose(metrics.periods.oneWeek, 1.4 / 1.3 - 1)
  assertClose(metrics.periods.oneMonth, 1.4 / 1.2 - 1)
  assertClose(metrics.periods.yearToDate, 0.4)
  assertClose(metrics.periods.sinceInception, 0.4)
})

test('clamps month ends and leap years with UTC calendar arithmetic', () => {
  const metrics = calculateFundReturnMetrics([
    point('2023-02-28', 1),
    point('2024-02-29', 1.1),
    point('2025-03-31', 1.21),
  ])
  assertClose(metrics.periods.oneMonth, 1.21 / 1.1 - 1)
  assertClose(metrics.periods.oneYear, 1.21 / 1.1 - 1)
})

test('returns null when history cannot cover a named period or one-year CAGR', () => {
  const metrics = calculateFundReturnMetrics([point('2025-08-02', 1), point('2026-08-01', 1.1)])
  assert.equal(metrics.periods.oneYear, null)
  assert.equal(metrics.annualized.oneYear, null)
  assert.equal(metrics.annualized.sinceInception, null)
})

test('calculates CAGR with actual UTC days and 365.2425 days per year', () => {
  const metrics = calculateFundReturnMetrics([point('2024-01-01', 1), point('2026-01-01', 1.44)])
  const expected = Math.pow(1.44, 365.2425 / 731) - 1
  assertClose(metrics.annualized.sinceInception, expected)
})

test('includes only completed quarters and years with in-period end points', () => {
  const metrics = calculateFundReturnMetrics([
    point('2024-12-31', 1),
    point('2025-03-31', 1.1),
    point('2025-06-27', 1.2),
    point('2025-12-31', 1.3),
    point('2026-01-15', 1.4),
  ])
  const year2025 = metrics.quarterlyReturns.find(({ year }) => year === 2025)
  assertClose(year2025?.firstQuarter ?? null, 0.1)
  assertClose(year2025?.secondQuarter ?? null, 1.2 / 1.1 - 1)
  assert.equal(year2025?.thirdQuarter, null)
  assertClose(year2025?.fourthQuarter ?? null, 1.3 / 1.2 - 1)
  assertClose(metrics.annualReturns[0]?.value ?? null, 0.3)
  assert.equal(metrics.annualReturns[0]?.year, 2025)
})

test('does not reuse an old point as a completed period end', () => {
  const metrics = calculateFundReturnMetrics([
    point('2024-12-31', 1),
    point('2025-03-31', 1.1),
    point('2026-01-15', 1.1),
  ])
  const year2025 = metrics.quarterlyReturns.find(({ year }) => year === 2025)
  assert.equal(year2025?.secondQuarter, null)
  assertClose(metrics.annualReturns[0]?.value ?? null, 0.1)
})

test('returns an empty stable result for no usable points', () => {
  const metrics = calculateFundReturnMetrics([])
  assert.equal(metrics.cutoffDate, null)
  assert.equal(metrics.periods.sinceInception, null)
  assert.deepEqual(metrics.quarterlyReturns, [])
})

test('keeps the first valid point when a date is duplicated', () => {
  const metrics = calculateReturnMetrics([
    { date: '2025-01-01', value: 100 },
    { date: '2026-01-01', value: 120 },
    { date: '2026-01-01', value: 900 },
  ])

  assertClose(metrics.periods.sinceInception, 0.2)
})

function point(date: string, reinvestedNetValue: number): FundReinvestedNavPoint {
  return { date, reinvestedNetValue, unitNetValue: reinvestedNetValue }
}

function assertClose(actual: number | null, expected: number): void {
  assert.ok(actual !== null)
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}
