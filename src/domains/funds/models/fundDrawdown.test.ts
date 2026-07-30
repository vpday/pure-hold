import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundCumulativeReturnPoint } from './fundCumulativeReturns.ts'
import { analyzeFundDrawdown } from './fundDrawdown.ts'

test('finds the peak and trough of the maximum drawdown', () => {
  const result = analyzeFundDrawdown(points([0, 10, 5, 2, 8, 10, 12]))

  assert.ok(result)
  assert.equal(result.peakIndex, 1)
  assert.equal(result.troughIndex, 3)
  assert.ok(Math.abs(result.maximumDrawdownPercent - 7.272727) < 0.000001)
})

test('preserves source indexes across null gaps', () => {
  const result = analyzeFundDrawdown(points([null, 0, 10, null, 4, 6]))

  assert.deepEqual(result, {
    maximumDrawdownPercent: (6 / 110) * 100,
    peakIndex: 2,
    troughIndex: 4,
  })
})

test('keeps the earliest trough when equal maximum drawdowns repeat', () => {
  const result = analyzeFundDrawdown(points([0, 10, 5, 10, 5]))

  assert.equal(result?.peakIndex, 1)
  assert.equal(result?.troughIndex, 2)
})

test('supports a total loss after a valid peak', () => {
  const result = analyzeFundDrawdown(points([0, -100]))

  assert.equal(result?.maximumDrawdownPercent, 100)
  assert.equal(result?.troughIndex, 1)
})

test('returns null without a positive drawdown', () => {
  assert.equal(analyzeFundDrawdown(points([])), null)
  assert.equal(analyzeFundDrawdown(points([null, null])), null)
  assert.equal(analyzeFundDrawdown(points([0, 1, 2])), null)
})

function points(values: readonly (number | null)[]): FundCumulativeReturnPoint[] {
  return values.map((fundYieldPercent, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    fundTypeYieldPercent: null,
    fundYieldPercent,
    referenceIndexYieldPercent: null,
  }))
}
