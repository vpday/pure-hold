import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  FundReinvestedNavIssue,
  FundReinvestedNavResult,
} from '@/domains/funds/models/fundReinvestedNav.ts'
import type {
  IndexPerformanceHistory,
  IndexPerformanceHistoryIssue,
} from '@/domains/indices/models/indexPerformanceHistory.ts'
import {
  calculateFundRollingExcessReturn,
  type FundRollingExcessRange,
} from './fundRollingExcessReturn.ts'

test('builds rolling points from exact twelve-calendar-month monthly endpoints', () => {
  const dates = monthEnds('2024-06', 25)
  const result = calculateFundRollingExcessReturn(
    fundHistory(dates.map((date, index) => [date, 100 + index * 2])),
    benchmarkHistory(dates.map((date, index) => [date, 1000 + index * 10])),
    'ln',
  )

  assert.equal(result.status, 'ready')
  assert.equal(result.points.length, 13)
  assert.equal(result.startDate, dates[12])
  assert.equal(result.commonCutoffDate, dates.at(-1))
  assert.deepEqual(
    result.points.map(({ date }) => date),
    dates.slice(12),
  )
})

test('uses compound relative growth rather than percentage-point subtraction', () => {
  const result = calculateFundRollingExcessReturn(
    fundHistory([
      ['2025-06-30', 1],
      ['2026-06-30', 1.2],
    ]),
    benchmarkHistory([
      ['2025-06-30', 1000],
      ['2026-06-30', 1100],
    ]),
    'ln',
  )
  const point = result.points[0]!

  assertClose(point.fundTrailingTwelveMonthReturn, 0.2)
  assertClose(point.benchmarkTrailingTwelveMonthReturn, 0.1)
  assertClose(point.excessReturn, 1.2 / 1.1 - 1)
  assert.notEqual(point.excessReturn, 0.1)
})

test('uses the final exact common observation in each completed month', () => {
  const result = calculateFundRollingExcessReturn(
    fundHistory([
      ['2025-06-27', 1],
      ['2025-06-30', 9],
      ['2026-06-26', 1.1],
      ['2026-06-29', 1.2],
    ]),
    benchmarkHistory(
      [
        ['2025-06-27', 100],
        ['2025-06-29', 999],
        ['2026-06-26', 105],
        ['2026-06-29', 110],
      ],
      [],
      '20260630',
    ),
    'ln',
  )

  assert.equal(result.points[0]?.date, '2026-06-29')
  assertClose(result.points[0]!.fundTrailingTwelveMonthReturn, 0.2)
  assertClose(result.points[0]!.benchmarkTrailingTwelveMonthReturn, 0.1)
})

test('excludes a month-in-progress and includes the cutoff month on its calendar month end', () => {
  const values: readonly Value[] = [
    ['2025-06-30', 100],
    ['2025-07-31', 101],
    ['2026-06-30', 110],
    ['2026-07-30', 120],
  ]
  const fund = fundHistory(values)
  const benchmarkValues = values.map(([date, value]) => [date, value * 10] as const)

  const midMonth = calculateFundRollingExcessReturn(
    fund,
    benchmarkHistory(benchmarkValues, [], '20260730'),
    'ln',
  )
  const monthEnd = calculateFundRollingExcessReturn(
    fund,
    benchmarkHistory(benchmarkValues, [], '20260731'),
    'ln',
  )

  assert.deepEqual(
    midMonth.points.map(({ date }) => date),
    ['2026-06-30'],
  )
  assert.deepEqual(
    monthEnd.points.map(({ date }) => date),
    ['2026-06-30', '2026-07-30'],
  )
})

test('handles leap years and cross-year month keys', () => {
  const result = calculateFundRollingExcessReturn(
    fundHistory([
      ['2023-02-28', 1],
      ['2023-12-29', 1.1],
      ['2024-02-29', 1.2],
      ['2024-12-31', 1.3],
    ]),
    benchmarkHistory([
      ['2023-02-28', 100],
      ['2023-12-29', 105],
      ['2024-02-29', 110],
      ['2024-12-31', 115],
    ]),
    'ln',
  )

  assert.deepEqual(
    result.points.map(({ date }) => date),
    ['2024-02-29', '2024-12-31'],
  )
})

test('skips a point when its exact prior calendar month is missing', () => {
  const result = calculateFundRollingExcessReturn(
    fundHistory([
      ['2025-05-30', 1],
      ['2025-07-31', 1.1],
      ['2026-06-30', 1.2],
      ['2026-07-31', 1.3],
    ]),
    benchmarkHistory([
      ['2025-05-30', 100],
      ['2025-07-31', 105],
      ['2026-06-30', 110],
      ['2026-07-31', 115],
    ]),
    'ln',
  )

  assert.deepEqual(
    result.points.map(({ date }) => date),
    ['2026-07-31'],
  )
})

test('returns insufficient data before a twelve-month pair and allows partial history', () => {
  const twelveDates = monthEnds('2025-01', 12)
  const insufficient = calculateFundRollingExcessReturn(
    fundHistory(twelveDates.map((date, index) => [date, index + 1])),
    benchmarkHistory(twelveDates.map((date, index) => [date, index + 100])),
    'n',
  )
  assert.equal(insufficient.status, 'insufficient-data')
  assert.deepEqual(insufficient.points, [])

  const nineteenDates = monthEnds('2025-01', 19)
  const partial = calculateFundRollingExcessReturn(
    fundHistory(nineteenDates.map((date, index) => [date, index + 1])),
    benchmarkHistory(nineteenDates.map((date, index) => [date, index + 100])),
    'n',
  )
  assert.equal(partial.status, 'ready')
  assert.equal(partial.points.length, 7)
})

test('filters display ranges by calendar buckets after calculating the full history', () => {
  const dates = monthEnds('2019-01', 85)
  const fund = fundHistory(dates.map((date, index) => [date, 100 + index]))
  const benchmark = benchmarkHistory(dates.map((date, index) => [date, 1000 + index]))
  const expectedCounts: Readonly<Record<FundRollingExcessRange, number>> = {
    '3n': 36,
    '5n': 60,
    ln: 73,
    n: 12,
  }

  for (const [range, count] of Object.entries(expectedCounts)) {
    const result = calculateFundRollingExcessReturn(
      fund,
      benchmark,
      range as FundRollingExcessRange,
    )
    assert.equal(result.points.length, count, range)
  }
})

test('does not reach farther back to fill a range when a recent month pair is missing', () => {
  const dates = monthEnds('2023-01', 43).filter((date) => date.slice(0, 7) !== '2025-12')
  const result = calculateFundRollingExcessReturn(
    fundHistory(dates.map((date, index) => [date, 100 + index])),
    benchmarkHistory(dates.map((date, index) => [date, 1000 + index])),
    'n',
  )

  assert.equal(result.points.length, 11)
  assert.ok(result.points.every(({ date }) => date >= '2025-08-01'))
})

test('preserves source issues without mutating either source', () => {
  const fundIssue: FundReinvestedNavIssue = {
    code: 'invalid-unit-net-value',
    count: 1,
    date: '2025-06-01',
  }
  const benchmarkIssue: IndexPerformanceHistoryIssue = { code: 'malformed-record', count: 1 }
  const fund = fundHistory(
    [
      ['2025-06-30', 1],
      ['2026-06-30', 1.1],
    ],
    [fundIssue],
  )
  const benchmark = benchmarkHistory(
    [
      ['2025-06-30', 100],
      ['2026-06-30', 105],
    ],
    [benchmarkIssue],
  )
  const fundBefore = structuredClone(fund)
  const benchmarkBefore = structuredClone(benchmark)

  const result = calculateFundRollingExcessReturn(fund, benchmark, 'ln')

  assert.deepEqual(result.sourceIssues, { benchmark: [benchmarkIssue], fund: [fundIssue] })
  assert.deepEqual(fund, fundBefore)
  assert.deepEqual(benchmark, benchmarkBefore)
})

type Value = readonly [date: string, value: number]

function fundHistory(
  values: readonly Value[],
  issues: readonly FundReinvestedNavIssue[] = [],
): FundReinvestedNavResult {
  return {
    appliedEvents: [],
    issues,
    points: values.map(([date, value]) => ({
      date,
      reinvestedNetValue: value,
      unitNetValue: value,
    })),
  }
}

function benchmarkHistory(
  values: readonly Value[],
  issues: readonly IndexPerformanceHistoryIssue[] = [],
  endDate = values.at(-1)?.[0]?.replaceAll('-', '') ?? '20260809',
): IndexPerformanceHistory {
  return {
    endDate,
    indexCode: 'H00300',
    indexName: '沪深300全收益指数',
    issues,
    points: values.map(([date, value]) => ({ date, value })),
    startDate: '20041231',
  }
}

function monthEnds(firstMonth: string, count: number): readonly string[] {
  const year = Number(firstMonth.slice(0, 4))
  const monthIndex = Number(firstMonth.slice(5, 7)) - 1
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex + index + 1, 0))
    return date.toISOString().slice(0, 10)
  })
}

function assertClose(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}
