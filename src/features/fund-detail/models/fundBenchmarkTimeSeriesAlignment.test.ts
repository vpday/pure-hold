import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundReinvestedNavPoint } from '@/domains/funds/models/fundReinvestedNav.ts'
import type { IndexPerformancePoint } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { alignFundBenchmarkTimeSeries } from './fundBenchmarkTimeSeriesAlignment.ts'

test('filters, sorts, deduplicates and aligns only exact common dates', () => {
  const fund: readonly FundReinvestedNavPoint[] = [
    { date: '2026-01-03', reinvestedNetValue: 1.2, unitNetValue: 1.2 },
    { date: 'invalid', reinvestedNetValue: 9, unitNetValue: 9 },
    { date: '2026-01-01', reinvestedNetValue: 1, unitNetValue: 1 },
    { date: '2026-01-03', reinvestedNetValue: 99, unitNetValue: 99 },
  ]
  const benchmark: readonly IndexPerformancePoint[] = [
    { date: '2026-01-03', value: 120 },
    { date: '2026-01-02', value: 110 },
    { date: '2026-01-01', value: 100 },
    { date: '2026-01-03', value: 999 },
  ]

  const result = alignFundBenchmarkTimeSeries(fund, benchmark)

  assert.deepEqual(
    result.fundPoints.map(({ date, reinvestedNetValue }) => [date, reinvestedNetValue]),
    [
      ['2026-01-01', 1],
      ['2026-01-03', 1.2],
    ],
  )
  assert.deepEqual(result.benchmarkPoints, [
    { date: '2026-01-01', value: 100 },
    { date: '2026-01-02', value: 110 },
    { date: '2026-01-03', value: 120 },
  ])
  assert.deepEqual(result.commonPoints, [
    {
      benchmarkPoint: { date: '2026-01-01', value: 100 },
      date: '2026-01-01',
      fundPoint: { date: '2026-01-01', reinvestedNetValue: 1, unitNetValue: 1 },
    },
    {
      benchmarkPoint: { date: '2026-01-03', value: 120 },
      date: '2026-01-03',
      fundPoint: { date: '2026-01-03', reinvestedNetValue: 1.2, unitNetValue: 1.2 },
    },
  ])
  assert.equal(result.commonCutoffDate, '2026-01-03')
})

test('returns no common cutoff without inventing a pair', () => {
  const result = alignFundBenchmarkTimeSeries(
    [{ date: '2026-01-01', reinvestedNetValue: 1, unitNetValue: 1 }],
    [{ date: '2026-01-02', value: 100 }],
  )

  assert.deepEqual(result.commonPoints, [])
  assert.equal(result.commonCutoffDate, null)
})
