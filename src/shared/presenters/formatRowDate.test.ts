import assert from 'node:assert/strict'
import test from 'node:test'

import { formatRowDate } from './formatRowDate.ts'

test('formats fund row dates from the header display shape', () => {
  const value = '2026-08-03 15:00'

  assert.equal(formatRowDate(value, '15:00'), '15:00')
  assert.equal(formatRowDate(value, '08-03 15:00'), '08-03 15:00')
  assert.equal(formatRowDate(value, '08-03'), '08-03')
})

test('formats a detail estimate as time without a table header', () => {
  assert.equal(formatRowDate('2026-08-03 15:00'), '15:00')
  assert.equal(formatRowDate('--'), '--')
  assert.equal(formatRowDate('unknown'), 'unknown')
})
