import assert from 'node:assert/strict'
import test from 'node:test'

import { createSellDraft } from './sellDraft.ts'

const options = { confirmationDays: 3, now: '2026-08-14T12:00:00.000Z' }

function input(overrides: Record<string, unknown> = {}) {
  return {
    entryMode: 'pending' as const,
    fundCode: '161725',
    id: 'sell-1',
    requestedUnits: '120.0000',
    submittedAt: '2026-08-14 12:00',
    ...overrides,
  }
}

test('creates a pending sell draft with requested units and unknown actual facts', () => {
  const result = createSellDraft(input({ actualNetAmountYuan: '0.00' }), options)

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.settlementStatus, 'pending-settlement')
  assert.equal(result.draft.navDate, '2026-08-14')
  assert.equal(result.draft.expectedConfirmationDate, '2026-08-19')
  assert.deepEqual(result.draft.requestedUnits, {
    confidence: 'actual',
    source: 'manual',
    value: 120,
  })
  assert.deepEqual(result.draft.units, {
    confidence: 'unknown',
    source: 'manual',
    value: null,
  })
  assert.deepEqual(result.draft.netAmount, {
    confidence: 'actual',
    source: 'manual',
    value: 0,
  })
  assert.deepEqual(result.draft.unitNav, {
    confidence: 'unknown',
    source: 'nav-history',
    value: null,
  })
  assert.deepEqual(result.draft.redemptionFee, {
    confidence: 'unknown',
    source: 'manual',
    value: null,
  })
})

test('creates a historical sell only with confirmed units and preserves zero fees', () => {
  const result = createSellDraft(
    input({
      actualGrossAmountYuan: '24.00',
      actualNetAmountYuan: '0.00',
      actualRedemptionFeeYuan: '0.00',
      actualUnits: '0.0001',
      confirmedDate: '2026-08-14',
      entryMode: 'historical',
      id: 'sell-zero',
      requestedUnits: '0.0001',
      submittedAt: '2026-08-13 12:00',
    }),
    { confirmationDays: null, now: '2026-08-14T12:00:00.000Z' },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.settlementStatus, 'settled')
  assert.equal(result.draft.redemptionFee.value, 0)
  assert.equal(result.draft.netAmount.value, 0)
  assert.equal(result.draft.grossAmount.value, 2400)
  assert.equal(result.draft.units.value, 0.0001)
})

test('rejects invalid dates, amounts and unit precision', () => {
  const result = createSellDraft(
    input({
      actualGrossAmountYuan: '1.001',
      actualNetAmountYuan: '1.001',
      actualRedemptionFeeYuan: '0.001',
      actualUnits: '1.23456',
      confirmedDate: '2026-08-09',
      requestedUnits: '0',
    }),
    options,
  )
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'actualGrossAmountYuan',
    'actualNetAmountYuan',
    'actualRedemptionFeeYuan',
    'actualUnits',
    'confirmedDate',
    'requestedUnits',
  ])
})
