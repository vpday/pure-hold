import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addTradingDays,
  deriveTransactionSchedule,
  getNextTradingDay,
  isTradingDay,
  isTradingHoliday,
} from './tradingCalendar.ts'

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

test('applies the Shanghai 15:00 cutoff on a trading day', () => {
  assert.deepEqual(
    deriveTransactionSchedule({ confirmationDays: 0, submittedAt: '2026-08-14 14:59' }),
    { expectedConfirmationDate: '2026-08-14', navDate: '2026-08-14' },
  )
  assert.deepEqual(
    deriveTransactionSchedule({ confirmationDays: 1, submittedAt: '2026-08-14 14:59' }),
    { expectedConfirmationDate: '2026-08-17', navDate: '2026-08-14' },
  )
  assert.deepEqual(
    deriveTransactionSchedule({ confirmationDays: 1, submittedAt: '2026-08-14 15:00' }),
    { expectedConfirmationDate: '2026-08-18', navDate: '2026-08-17' },
  )
  assert.deepEqual(
    deriveTransactionSchedule({ confirmationDays: null, submittedAt: '2026-08-14 15:01' }),
    { navDate: '2026-08-17' },
  )
})

test('moves weekend and holiday submissions to the next trading day', () => {
  assert.deepEqual(
    deriveTransactionSchedule({ confirmationDays: 0, submittedAt: '2026-08-15 10:00' }),
    { expectedConfirmationDate: '2026-08-17', navDate: '2026-08-17' },
  )
  assert.deepEqual(
    deriveTransactionSchedule({ confirmationDays: 0, submittedAt: '2026-04-06 10:00' }),
    { expectedConfirmationDate: '2026-04-07', navDate: '2026-04-07' },
  )
  assert.equal(isTradingDay('2026-04-06'), false)
  assert.equal(isTradingDay('2026-04-07'), true)
})

test('counts T+N using trading days and omits a missing rule', () => {
  assert.equal(addTradingDays('2026-04-03', 1), '2026-04-07')
  assert.equal(addTradingDays('2026-08-14', 1), '2026-08-17')
  assert.deepEqual(
    deriveTransactionSchedule({ confirmationDays: null, submittedAt: '2026-08-14 12:00' }),
    { navDate: '2026-08-14' },
  )
  assert.equal(getNextTradingDay('2026-08-14'), '2026-08-17')
})

test('rejects malformed submission times and invalid trading-day offsets', () => {
  assert.throws(
    () => deriveTransactionSchedule({ confirmationDays: 1, submittedAt: '2026-08-14 24:00' }),
    /invalid/i,
  )
  assert.throws(() => addTradingDays('2026-08-15', 1), /trading date/i)
  assert.throws(
    () => deriveTransactionSchedule({ confirmationDays: -1, submittedAt: '2026-08-14 12:00' }),
    /confirmation days/i,
  )
})
