import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createFundHoldingCorrectionDraft,
  validateFundHoldingCorrectionDraft,
} from './fundHoldingCorrectionDraft.ts'

test('defaults correction date to today and preserves precise target facts', () => {
  assert.deepEqual(createFundHoldingCorrectionDraft(12.3456, 12345, new Date(2026, 7, 18)), {
    confirmedDate: '2026-08-18',
    reason: '',
    targetUnits: '12.3456',
    totalCostYuan: '123.45',
  })
})

test('requires a reason and matching zero-or-positive target facts', () => {
  const result = validateFundHoldingCorrectionDraft(
    {
      confirmedDate: '2026-08-18',
      reason: '',
      targetUnits: '0',
      totalCostYuan: '1',
    },
    new Date(2026, 7, 18),
  )

  assert.deepEqual(result.errors, {
    reason: '请填写修正原因',
    target: '份额和总成本必须同时为零或同时为正',
  })
})

test('accepts a historical correction date and converts total cost to cents', () => {
  assert.deepEqual(
    validateFundHoldingCorrectionDraft(
      {
        confirmedDate: '2026-08-17',
        reason: '导入对账单',
        targetUnits: '12.3456',
        totalCostYuan: '123.45',
      },
      new Date(2026, 7, 18),
    ),
    {
      errors: {},
      input: {
        confirmedDate: '2026-08-17',
        reason: '导入对账单',
        targetUnits: 12.3456,
        totalCostCents: 12345,
      },
    },
  )
})
