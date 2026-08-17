import assert from 'node:assert/strict'
import test from 'node:test'

import { createBuyDraft } from './buyDraft.ts'

const options = { confirmationDays: 1, now: '2026-08-14T12:00:00.000Z' }

function input(overrides: Record<string, unknown> = {}) {
  return {
    entryMode: 'pending' as const,
    fundCode: '161725',
    id: 'buy-1',
    purchaseFeePercent: 1,
    submittedAt: '2026-08-14 12:00',
    totalAmountYuan: '100.00',
    ...overrides,
  }
}

test('creates a pending buy draft with the scheduled NAV and expected confirmation date', () => {
  const result = createBuyDraft(input(), options)

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.entryMode, 'pending')
  assert.equal(result.draft.navDate, '2026-08-14')
  assert.equal(result.draft.expectedConfirmationDate, '2026-08-17')
  assert.equal(result.draft.confirmedDate, undefined)
  assert.equal(result.draft.settlementStatus, 'pending-settlement')
  assert.deepEqual(result.draft.unitNav, {
    confidence: 'unknown',
    source: 'nav-history',
    value: null,
  })
  assert.deepEqual(result.draft.purchaseFee, {
    confidence: 'unknown',
    source: 'formula',
    value: null,
  })
})

test('creates a historical buy only when confirmation facts are present', () => {
  const result = createBuyDraft(
    input({
      actualPurchaseFeeYuan: '0.99',
      actualUnits: '49.5050',
      confirmedDate: '2026-08-14',
      entryMode: 'historical',
      id: 'buy-historical',
      submittedAt: '2026-08-13 12:00',
    }),
    { confirmationDays: null, now: '2026-08-14T12:00:00.000Z' },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.navDate, '2026-08-13')
  assert.equal(result.draft.expectedConfirmationDate, undefined)
  assert.equal(result.draft.settlementStatus, 'settled')
  assert.deepEqual(result.draft.units, {
    confidence: 'actual',
    source: 'manual',
    value: 49.505,
  })
  assert.deepEqual(result.draft.purchaseFee, {
    confidence: 'actual',
    source: 'manual',
    value: 99,
  })
  assert.deepEqual(result.draft.unitNav, {
    confidence: 'unknown',
    source: 'nav-history',
    value: null,
  })
})

test('rejects a historical buy without confirmation facts', () => {
  const result = createBuyDraft(
    input({ entryMode: 'historical', submittedAt: '2026-08-14 12:00' }),
    { confirmationDays: null, now: '2026-08-14T12:00:00.000Z' },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(result.errors.confirmedDate)
  assert.ok(result.errors.actualUnits)
})

test('rejects invalid amount precision, unit precision, dates and fee rates', () => {
  const result = createBuyDraft(
    input({
      actualPurchaseFeeYuan: '-0.01',
      actualUnits: '1.23456',
      confirmedDate: '2026-08-15',
      purchaseFeePercent: -1,
      totalAmountYuan: '100.001',
    }),
    options,
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'actualPurchaseFeeYuan',
    'actualUnits',
    'confirmedDate',
    'purchaseFeePercent',
    'totalAmountYuan',
  ])
})

test('accepts zero optional actual values and the inclusive fee-rate boundary', () => {
  const result = createBuyDraft(
    input({
      actualPurchaseFeeYuan: '0.00',
      actualUnits: '0',
      confirmedDate: '2026-08-14',
      purchaseFeePercent: 100,
      totalAmountYuan: '0.01',
    }),
    options,
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.units.value, 0)
  assert.equal(result.draft.purchaseFee.value, 0)
  assert.equal(result.draft.purchaseFeeRate.value, 100)
  assert.equal(result.draft.settlementStatus, 'settled')
})

test('rejects a weekend confirmation date and out-of-range or over-precise fee rates', () => {
  for (const purchaseFeePercent of [100.00001, -0.00001]) {
    const result = createBuyDraft(
      input({
        confirmedDate: '2026-08-09',
        id: `buy-rate-${purchaseFeePercent}`,
        purchaseFeePercent,
      }),
      options,
    )
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.ok(result.errors.confirmedDate)
    assert.ok(result.errors.purchaseFeePercent)
  }
})
