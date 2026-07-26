import assert from 'node:assert/strict'
import test from 'node:test'

import { formatEstimatedDisplayDate, formatNavDisplayDate } from './formatFundDates.ts'

test('formats fund dates consistently for table headers and mobile cards', () => {
  const now = new Date('2026-07-26T08:00:00+08:00')

  assert.equal(formatEstimatedDisplayDate('2026-07-26 14:05', now), '14:05')
  assert.equal(formatEstimatedDisplayDate('2026-07-25 14:05', now), '07-25 14:05')
  assert.equal(formatNavDisplayDate('2026-07-25'), '07-25')
  assert.equal(formatEstimatedDisplayDate('--', now), '--')
  assert.equal(formatNavDisplayDate('--'), '--')
})
