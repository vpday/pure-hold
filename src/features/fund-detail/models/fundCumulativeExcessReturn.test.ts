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
import { calculateFundCumulativeExcessReturn } from './fundCumulativeExcessReturn.ts'

test('aligns exact dates, uses the latest common cutoff and starts the selected range at zero', () => {
  const fund = fundHistory([
    ['2026-06-30', 0.9],
    ['2026-07-09', 1],
    ['2026-07-10', 1.02],
    ['2026-07-11', 1.03],
    ['2026-08-07', 1.08],
    ['2026-08-08', 1.09],
  ])
  const benchmark = benchmarkHistory([
    ['2026-07-08', 990],
    ['2026-07-10', 1000],
    ['2026-07-12', 1020],
    ['2026-08-07', 1050],
  ])

  const result = calculateFundCumulativeExcessReturn(fund, benchmark, 'y')

  assert.equal(result.status, 'ready')
  assert.equal(result.commonCutoffDate, '2026-08-07')
  assert.equal(result.startDate, '2026-07-10')
  assert.deepEqual(
    result.points.map(({ date }) => date),
    ['2026-07-10', '2026-08-07'],
  )
  assert.deepEqual(result.points[0], {
    benchmarkReturn: 0,
    date: '2026-07-10',
    fundReturn: 0,
    excessReturn: 0,
  })
  assertClose(result.fundReturn, 1.08 / 1.02 - 1)
  assertClose(result.benchmarkReturn, 0.05)
  assertClose(result.excessReturn, 1.08 / 1.02 / 1.05 - 1)
})

test('supports every range with UTC month, year, year-to-date and inception boundaries', () => {
  const dates = [
    '2020-02-28',
    '2021-02-28',
    '2023-02-28',
    '2025-02-28',
    '2025-08-31',
    '2025-11-30',
    '2026-01-01',
    '2026-02-28',
  ]
  const fund = fundHistory(dates.map((date, index) => [date, index + 1]))
  const benchmark = benchmarkHistory(dates.map((date, index) => [date, (index + 1) * 100]))
  const expectedStarts = {
    '3n': '2023-02-28',
    '3y': '2025-11-30',
    '5n': '2021-02-28',
    '6y': '2025-08-31',
    jn: '2026-01-01',
    ln: '2020-02-28',
    n: '2025-02-28',
    y: '2026-02-28',
  } as const

  for (const [range, startDate] of Object.entries(expectedStarts)) {
    const result = calculateFundCumulativeExcessReturn(
      fund,
      benchmark,
      range as keyof typeof expectedStarts,
    )
    if (range === 'y') {
      assert.equal(result.status, 'insufficient-data')
    } else {
      assert.equal(result.startDate, startDate, range)
    }
  }
})

test('clamps leap-day year subtraction and uses the next common observation', () => {
  const result = calculateFundCumulativeExcessReturn(
    fundHistory([
      ['2023-02-27', 1],
      ['2023-03-01', 1.1],
      ['2024-02-29', 1.2],
    ]),
    benchmarkHistory([
      ['2023-02-28', 100],
      ['2023-03-01', 105],
      ['2024-02-29', 110],
    ]),
    'n',
  )

  assert.equal(result.startDate, '2023-03-01')
})

test('calculates positive, negative and zero compound excess returns', () => {
  for (const [fundEnd, benchmarkEnd, expectedSign] of [
    [1.2, 110, 1],
    [1.05, 110, -1],
    [1.1, 110, 0],
  ] as const) {
    const result = calculateFundCumulativeExcessReturn(
      fundHistory([
        ['2026-01-01', 1],
        ['2026-02-01', fundEnd],
      ]),
      benchmarkHistory([
        ['2026-01-01', 100],
        ['2026-02-01', benchmarkEnd],
      ]),
      'ln',
    )
    assert.equal(Math.sign(result.excessReturn!), expectedSign)
  }
})

test('sorts, filters and deterministically keeps the first duplicate without mutating inputs', () => {
  const fund = fundHistory([
    ['2026-02-01', 1.2],
    ['invalid', 5],
    ['2026-01-01', 1],
    ['2026-02-01', 9],
    ['2026-01-15', Number.NaN],
    ['2026-99-99', 3],
  ])
  const benchmark = benchmarkHistory([
    ['2026-02-01', 120],
    ['2026-01-01', 100],
    ['2026-02-01', 900],
    ['2026-01-15', 0],
  ])
  const fundSnapshot = [...fund.points]
  const benchmarkSnapshot = [...benchmark.points]

  const result = calculateFundCumulativeExcessReturn(fund, benchmark, 'ln')

  assertClose(result.fundReturn, 0.2)
  assertClose(result.benchmarkReturn, 0.2)
  assert.deepEqual(fund.points, fundSnapshot)
  assert.deepEqual(benchmark.points, benchmarkSnapshot)
})

test('returns stable insufficient results for zero or one common observation', () => {
  const none = calculateFundCumulativeExcessReturn(
    fundHistory([['2026-01-01', 1]]),
    benchmarkHistory([['2026-01-02', 100]]),
    'ln',
  )
  assert.deepEqual(none.points, [])
  assert.equal(none.commonCutoffDate, null)
  assert.equal(none.status, 'insufficient-data')

  const one = calculateFundCumulativeExcessReturn(
    fundHistory([
      ['2000-01-01', 1],
      ['2004-12-31', 2],
    ]),
    benchmarkHistory([['2004-12-31', 100]]),
    'ln',
  )
  assert.equal(one.commonCutoffDate, '2004-12-31')
  assert.equal(one.startDate, null)
  assert.equal(one.status, 'insufficient-data')
})

test('preserves source issues without blocking a valid curve', () => {
  const fundIssue: FundReinvestedNavIssue = {
    code: 'invalid-unit-net-value',
    count: 1,
    date: '2026-01-02',
  }
  const benchmarkIssue: IndexPerformanceHistoryIssue = { code: 'malformed-record', count: 1 }
  const result = calculateFundCumulativeExcessReturn(
    fundHistory(
      [
        ['2026-01-01', 1],
        ['2026-02-01', 1.1],
      ],
      [fundIssue],
    ),
    benchmarkHistory(
      [
        ['2026-01-01', 100],
        ['2026-02-01', 105],
      ],
      [benchmarkIssue],
    ),
    'ln',
  )

  assert.equal(result.status, 'ready')
  assert.deepEqual(result.sourceIssues, { benchmark: [benchmarkIssue], fund: [fundIssue] })
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
): IndexPerformanceHistory {
  return {
    endDate: values.at(-1)?.[0]?.replaceAll('-', '') ?? '20260809',
    indexCode: 'H00300',
    indexName: '沪深300全收益指数',
    issues,
    points: values.map(([date, value]) => ({ date, value })),
    startDate: '20041231',
  }
}

function assertClose(actual: number | null, expected: number): void {
  assert.ok(actual !== null)
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}
