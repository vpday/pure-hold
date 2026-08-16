import assert from 'node:assert/strict'
import test from 'node:test'

import { createSellDraft } from './sellDraft.ts'

test('creates a settled sell draft from units and preserves an actual zero receipt', () => {
  const result = createSellDraft(
    {
      actualNetAmountYuan: '0.00',
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'sell-1',
      units: '120.0000',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.draft.settlementStatus, 'settled')
  assert.deepEqual(result.draft.units, { confidence: 'actual', source: 'manual', value: 120 })
  assert.deepEqual(result.draft.netAmount, {
    confidence: 'actual',
    source: 'manual',
    value: 0,
  })
  assert.equal(result.draft.unitNav, undefined)
  assert.equal(result.draft.redemptionFee, undefined)
})

test('preserves optional zero fees and rejects invalid dates and precision', () => {
  const valid = createSellDraft(
    {
      actualNetAmountYuan: '0.00',
      actualRedemptionFeeYuan: '0.00',
      actualUnitNav: '0.0001',
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'sell-zero',
      units: '0.0001',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )
  assert.equal(valid.ok, true)
  if (valid.ok) assert.equal(valid.draft.redemptionFee?.value, 0)

  const invalid = createSellDraft(
    {
      actualNetAmountYuan: '1.001',
      actualRedemptionFeeYuan: '0.001',
      actualUnitNav: '0',
      confirmedDate: '2026-08-09',
      fundCode: '161725',
      id: 'sell-invalid',
      units: '1.23456',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )
  assert.equal(invalid.ok, false)
  if (invalid.ok) return
  assert.deepEqual(Object.keys(invalid.errors).sort(), [
    'actualNetAmountYuan',
    'actualRedemptionFeeYuan',
    'actualUnitNav',
    'confirmedDate',
    'units',
  ])
})
