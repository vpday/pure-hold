import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateDrawdownPath, type DrawdownValuePoint } from './drawdownPath.ts'

test('calculates a signed underwater path and resets at new peaks', () => {
  const source: readonly DrawdownValuePoint[] = [
    { date: '2024-01-01', value: 100 },
    { date: '2024-01-02', value: 80 },
    { date: '2024-01-03', value: 90 },
    { date: '2024-01-04', value: 120 },
    { date: '2024-01-05', value: 90 },
  ]

  const result = calculateDrawdownPath(source)

  assert.deepEqual(
    result.points.map(({ date }) => date),
    source.map(({ date }) => date),
  )
  assert.deepEqual(
    result.points.map(({ drawdown }) => drawdown.toFixed(2)),
    ['0.00', '-0.20', '-0.10', '0.00', '-0.25'],
  )
  assert.equal(result.maximumDrawdown, -0.25)
})

test('returns zero maximum drawdown for flat and rising paths', () => {
  assert.equal(
    calculateDrawdownPath([
      { date: '2024-01-01', value: 1 },
      { date: '2024-01-02', value: 1 },
      { date: '2024-01-03', value: 2 },
    ]).maximumDrawdown,
    0,
  )
})

test('keeps an empty or single-point path semantically insufficient', () => {
  assert.deepEqual(calculateDrawdownPath([]), { maximumDrawdown: null, points: [] })
  assert.deepEqual(calculateDrawdownPath([{ date: '2024-01-01', value: 1 }]), {
    maximumDrawdown: null,
    points: [{ date: '2024-01-01', drawdown: 0 }],
  })
})

test('does not mutate its input', () => {
  const source = [
    { date: '2024-01-01', value: 2 },
    { date: '2024-01-02', value: 1 },
  ]
  const before = structuredClone(source)

  calculateDrawdownPath(source)

  assert.deepEqual(source, before)
})
