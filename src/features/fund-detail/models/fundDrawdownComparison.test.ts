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
  calculateFundDrawdownComparison,
  type FundDrawdownRange,
} from './fundDrawdownComparison.ts'

test('aligns exact dates to the latest common cutoff and calculates independent drawdowns', () => {
  const result = calculateFundDrawdownComparison(
    fundHistory([
      ['2025-01-01', 100],
      ['2025-06-01', 80],
      ['2026-01-01', 120],
      ['2026-06-01', 90],
      ['2026-08-08', 130],
    ]),
    benchmarkHistory([
      ['2025-01-01', 100],
      ['2025-06-01', 110],
      ['2026-01-01', 90],
      ['2026-06-01', 120],
      ['2026-08-07', 130],
    ]),
    'ln',
  )

  assert.equal(result.status, 'ready')
  assert.equal(result.commonCutoffDate, '2026-06-01')
  assert.deepEqual(
    result.points.map(({ date }) => date),
    ['2025-01-01', '2025-06-01', '2026-01-01', '2026-06-01'],
  )
  assert.deepEqual(
    result.points.map(({ fundDrawdown }) => fundDrawdown.toFixed(2)),
    ['0.00', '-0.20', '0.00', '-0.25'],
  )
  assert.deepEqual(
    result.points.map(({ benchmarkDrawdown }) => benchmarkDrawdown.toFixed(2)),
    ['0.00', '0.00', '-0.18', '0.00'],
  )
  assert.equal(result.fundMaximumDrawdown, -0.25)
  assert.equal(result.benchmarkMaximumDrawdown?.toFixed(2), '-0.18')
})

test('supports only the four drawdown ranges and starts at the first common point in range', () => {
  const dates = ['2020-02-28', '2021-02-28', '2023-03-01', '2025-03-01', '2026-02-28']
  const fund = fundHistory(dates.map((date, index) => [date, index + 1]))
  const benchmark = benchmarkHistory(dates.map((date, index) => [date, index + 100]))
  const starts: Readonly<Record<FundDrawdownRange, string>> = {
    '3n': '2023-03-01',
    '5n': '2021-02-28',
    ln: '2020-02-28',
    n: '2025-03-01',
  }

  for (const [range, startDate] of Object.entries(starts)) {
    assert.equal(
      calculateFundDrawdownComparison(fund, benchmark, range as FundDrawdownRange).startDate,
      startDate,
      range,
    )
  }
})

test('filters invalid and duplicate points without mutating inputs', () => {
  const fund = fundHistory([
    ['2026-02-01', 80],
    ['invalid', 100],
    ['2026-01-01', 100],
    ['2026-02-01', 999],
  ])
  const benchmark = benchmarkHistory([
    ['2026-02-01', 90],
    ['2026-01-01', 100],
    ['2026-02-01', 999],
    ['2026-03-01', 0],
  ])
  const fundBefore = structuredClone(fund)
  const benchmarkBefore = structuredClone(benchmark)

  const result = calculateFundDrawdownComparison(fund, benchmark, 'ln')

  assert.equal(result.fundMaximumDrawdown?.toFixed(2), '-0.20')
  assert.equal(result.benchmarkMaximumDrawdown?.toFixed(2), '-0.10')
  assert.deepEqual(fund, fundBefore)
  assert.deepEqual(benchmark, benchmarkBefore)
})

test('returns stable insufficient results for fewer than two common points', () => {
  const none = calculateFundDrawdownComparison(
    fundHistory([['2026-01-01', 1]]),
    benchmarkHistory([['2026-01-02', 100]]),
    'ln',
  )
  assert.equal(none.commonCutoffDate, null)
  assert.equal(none.status, 'insufficient-data')
  assert.deepEqual(none.points, [])

  const one = calculateFundDrawdownComparison(
    fundHistory([['2026-01-01', 1]]),
    benchmarkHistory([['2026-01-01', 100]]),
    'ln',
  )
  assert.equal(one.commonCutoffDate, '2026-01-01')
  assert.equal(one.fundMaximumDrawdown, null)
  assert.equal(one.status, 'insufficient-data')
})

test('preserves source issues without blocking a valid result', () => {
  const fundIssue: FundReinvestedNavIssue = {
    code: 'invalid-unit-net-value',
    count: 1,
    date: '2026-01-02',
  }
  const benchmarkIssue: IndexPerformanceHistoryIssue = { code: 'malformed-record', count: 1 }
  const result = calculateFundDrawdownComparison(
    fundHistory(
      [
        ['2026-01-01', 1],
        ['2026-02-01', 0.9],
      ],
      [fundIssue],
    ),
    benchmarkHistory(
      [
        ['2026-01-01', 100],
        ['2026-02-01', 95],
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
