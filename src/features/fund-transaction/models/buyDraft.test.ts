import assert from 'node:assert/strict'
import test from 'node:test'

import { createBuyDraft } from './buyDraft.ts'

test('creates a pending buy draft from a gross amount and fee-rate snapshot', () => {
  const result = createBuyDraft(
    {
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'buy-1',
      purchaseFeePercent: 1,
      totalAmountYuan: '100.00',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.settlementStatus, 'pending-settlement')
  assert.deepEqual(result.draft.totalAmount, {
    confidence: 'actual',
    source: 'manual',
    value: 10000,
  })
  assert.deepEqual(result.draft.purchaseFeeRate, {
    confidence: 'actual',
    source: 'fund-basic-info',
    value: 1,
  })
  assert.deepEqual(result.draft.unitNav, {
    confidence: 'unknown',
    source: 'manual',
    value: null,
  })
})

test('keeps explicitly entered actual units, fee and NAV as actual fields', () => {
  const result = createBuyDraft(
    {
      actualPurchaseFeeYuan: '0.99',
      actualUnitNav: '2.0000',
      actualUnits: '49.5050',
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'buy-actual',
      purchaseFeePercent: 1,
      purchaseFeePercentSource: 'manual',
      totalAmountYuan: '100',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.units.value, 49.505)
  assert.equal(result.draft.purchaseFee.value, 99)
  assert.equal(result.draft.unitNav.value, 2)
  assert.equal(result.draft.purchaseFeeRate.source, 'manual')
})

test('keeps plan and installment associations on plan buy drafts', () => {
  const result = createBuyDraft(
    {
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'plan-buy-1',
      installmentId: 'installment-1',
      planId: 'plan-1',
      purchaseFeePercent: null,
      totalAmountYuan: '500',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.source, 'plan')
  assert.equal(result.draft.planId, 'plan-1')
  assert.equal(result.draft.installmentId, 'installment-1')
})

test('rejects invalid amount precision, unit precision, dates and non-trustworthy values', () => {
  const result = createBuyDraft(
    {
      actualPurchaseFeeYuan: '-0.01',
      actualUnitNav: '0',
      actualUnits: '1.23456',
      confirmedDate: '2026-08-15',
      fundCode: '161725',
      id: 'buy-invalid',
      purchaseFeePercent: -1,
      totalAmountYuan: '100.001',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'actualPurchaseFeeYuan',
    'actualUnitNav',
    'actualUnits',
    'confirmedDate',
    'purchaseFeePercent',
    'totalAmountYuan',
  ])
})

test('accepts zero optional actual values and the inclusive fee-rate boundary', () => {
  const result = createBuyDraft(
    {
      actualPurchaseFeeYuan: '0.00',
      actualUnitNav: '0.0001',
      actualUnits: '0',
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'buy-zero',
      purchaseFeePercent: 100,
      totalAmountYuan: '0.01',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.units.value, 0)
  assert.equal(result.draft.purchaseFee.value, 0)
  assert.equal(result.draft.purchaseFeeRate.value, 100)
})

test('rejects a weekend fact date and out-of-range or over-precise fee rates', () => {
  for (const purchaseFeePercent of [100.00001, -0.00001]) {
    const result = createBuyDraft(
      {
        confirmedDate: '2026-08-09',
        fundCode: '161725',
        id: `buy-rate-${purchaseFeePercent}`,
        purchaseFeePercent,
        totalAmountYuan: '1.00',
      },
      { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
    )
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.ok(result.errors.confirmedDate)
    assert.ok(result.errors.purchaseFeePercent)
  }
})
