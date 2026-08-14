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
