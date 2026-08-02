import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundDistributionHistory } from './fundDistributionHistory.ts'
import type { FundNetValueHistory } from './fundNetValueHistory.ts'
import { calculateFundReinvestedNav } from './fundReinvestedNav.ts'

test('calculates returns without corporate actions', () => {
  const result = calculateFundReinvestedNav(
    history([
      ['2026-01-02', 1],
      ['2026-01-05', 1.1],
    ]),
    distribution(),
  )
  assert.deepEqual(
    result.points.map(({ reinvestedNetValue }) => reinvestedNetValue),
    [1, 1.1],
  )
  assert.deepEqual(result.issues, [])
})

test('combines same-day dividends and a conversion without losing precision', () => {
  const result = calculateFundReinvestedNav(
    history([
      ['2026-01-02', 1],
      ['2026-01-05', 0.4],
    ]),
    distribution(
      [['2026-01-05', 2]],
      [
        ['2026-01-05', 1],
        ['2026-01-05', 1],
      ],
    ),
  )
  assert.equal(result.points[1]?.reinvestedNetValue, 1)
})

test('ignores invalid net values and reports them', () => {
  const source = history([
    ['2026-01-02', 1],
    ['2026-01-03', null],
    ['2026-01-05', 1.1],
  ])
  const result = calculateFundReinvestedNav(source, distribution())
  assert.deepEqual(
    result.points.map(({ date }) => date),
    ['2026-01-02', '2026-01-05'],
  )
  assert.deepEqual(result.issues, [
    { code: 'invalid-unit-net-value', count: 1, date: '2026-01-03' },
  ])
})

test('ignores invalid and unmatched corporate actions', () => {
  const result = calculateFundReinvestedNav(
    history([
      ['2026-01-02', 1],
      ['2026-01-05', 1.1],
    ]),
    distribution(
      [
        ['2026-01-05', null],
        ['2026-01-06', 2],
      ],
      [
        ['2026-01-05', -1],
        ['2026-01-06', 1],
      ],
    ),
  )
  assert.deepEqual(
    result.issues.map(({ code }) => code),
    [
      'invalid-dividend',
      'unmatched-dividend-date',
      'invalid-conversion',
      'unmatched-conversion-date',
    ],
  )
  assert.equal(result.points[1]?.reinvestedNetValue, 1.1)
})

test('ignores corporate actions on the first valid net-value date', () => {
  const result = calculateFundReinvestedNav(
    history([
      ['2026-01-02', 1],
      ['2026-01-05', 1.1],
    ]),
    distribution([['2026-01-02', 2]], [['2026-01-02', 1]]),
  )
  assert.deepEqual(
    result.issues.map(({ code }) => code),
    ['first-date-dividend', 'first-date-conversion'],
  )
})

test('ignores every valid conversion when a date has duplicates', () => {
  const result = calculateFundReinvestedNav(
    history([
      ['2026-01-02', 1],
      ['2026-01-05', 0.5],
    ]),
    distribution([
      ['2026-01-05', 2],
      ['2026-01-05', 3],
    ]),
  )
  assert.equal(result.points[1]?.reinvestedNetValue, 0.5)
  assert.deepEqual(result.issues, [{ code: 'duplicate-conversion', count: 2, date: '2026-01-05' }])
})

test('rejects histories for different funds', () => {
  assert.throws(
    () => calculateFundReinvestedNav(history([['2026-01-02', 1]]), distribution([], [], '000001')),
    /same fund/,
  )
})

type NetValue = readonly [date: string, value: number | null]
type Action = readonly [date: string, value: number | null]

function history(values: readonly NetValue[], fundCode = '161725'): FundNetValueHistory {
  return {
    fundCode,
    points: values.map(([date, unitNetValue]) => ({
      cumulativeNetValue: null,
      dailyGrowthPercent: null,
      date,
      unitNetValue,
    })),
    range: 'ln',
  }
}

function distribution(
  conversions: readonly Action[] = [],
  dividends: readonly Action[] = [],
  fundCode = '161725',
): FundDistributionHistory {
  return {
    conversions: conversions.map(([conversionDate, ratio]) => ({ conversionDate, ratio })),
    dividends: dividends.map(([exDividendDate, dividendPerTenUnits]) => ({
      dividendPerTenUnits,
      equityRecordDate: null,
      exDividendDate,
      paymentDate: null,
    })),
    fundCode,
  }
}
