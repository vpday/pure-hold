import assert from 'node:assert/strict'
import test from 'node:test'

import { isTradingDay, isTradingHoliday } from './tradingCalendar.ts'

test('recognizes ordinary and future configured-year workdays', () => {
  assert.equal(isTradingDay('2026-01-05'), true)
  assert.equal(isTradingDay('2030-01-02'), true)
})

test('rejects weekends and configured holidays independently', () => {
  assert.equal(isTradingDay('2026-01-03'), false)
  assert.equal(isTradingDay('2026-01-04'), false)
  assert.equal(isTradingDay('2026-01-01'), false)
  assert.equal(isTradingHoliday('2026-01-01'), true)
  assert.equal(isTradingHoliday('2026-01-03'), true)
  assert.equal(isTradingHoliday('2026-01-04'), false)
})

test('rejects impossible dates and does not treat unknown dates as holidays', () => {
  assert.equal(isTradingDay('2026-02-30'), false)
  assert.equal(isTradingDay(''), false)
  assert.equal(isTradingHoliday('2026-02-30'), false)
  assert.equal(isTradingHoliday('2030-01-02'), false)
})
