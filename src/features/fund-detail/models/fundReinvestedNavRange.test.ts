import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundReinvestedNavResult } from '@/domains/funds/models/fundReinvestedNav.ts'
import { selectFundReinvestedNavRange } from './fundReinvestedNavRange.ts'

test('clamps month ends and includes both date boundaries', () => {
  const result = selectFundReinvestedNavRange(
    source(['2024-02-28', '2024-02-29', '2024-08-31']),
    '6y',
  )
  assert.deepEqual(
    result.points.map(({ date }) => date),
    ['2024-02-29', '2024-08-31'],
  )
  assert.deepEqual(result.appliedEvents, [{ date: '2024-02-29', type: 'dividend' }])
})

test('clamps leap-day year subtraction and starts on the next available trading date', () => {
  const result = selectFundReinvestedNavRange(
    source(['2023-02-27', '2023-03-01', '2024-02-29']),
    'n',
  )
  assert.deepEqual(
    result.points.map(({ date }) => date),
    ['2023-03-01', '2024-02-29'],
  )
})

test('uses the final point for year-to-date and preserves inception history', () => {
  const complete = source(['2025-12-31', '2026-01-01', '2026-07-29'])
  assert.deepEqual(
    selectFundReinvestedNavRange(complete, 'jn').points.map(({ date }) => date),
    ['2026-01-01', '2026-07-29'],
  )
  assert.equal(selectFundReinvestedNavRange(complete, 'ln').points, complete.points)
})

function source(dates: readonly string[]): FundReinvestedNavResult {
  return {
    appliedEvents: [{ date: dates.at(-2)!, type: 'dividend' }],
    issues: [],
    points: dates.map((date, index) => ({
      date,
      reinvestedNetValue: index + 1,
      unitNetValue: index + 1,
    })),
  }
}
