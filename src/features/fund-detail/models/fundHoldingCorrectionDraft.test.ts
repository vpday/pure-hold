import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createFundHoldingCorrectionDraft,
  validateFundHoldingCorrectionDraft,
} from './fundHoldingCorrectionDraft.ts'

test('defaults correction date to today and preserves precise target facts', () => {
  assert.deepEqual(createFundHoldingCorrectionDraft(12.3456, 123.45, 0, new Date(2026, 7, 18)), {
    confirmedDate: '2026-08-18',
    holdingAmountYuan: '123.45',
    holdingIncomeYuan: '0.00',
    reason: '',
    targetUnits: '12.3456',
  })
})

test('requires a reason and matching zero-or-positive target facts', () => {
  const result = validateFundHoldingCorrectionDraft(
    {
      confirmedDate: '2026-08-18',
      holdingAmountYuan: '1',
      holdingIncomeYuan: '0',
      reason: '',
      targetUnits: '0',
    },
    new Date(2026, 7, 18),
  )

  assert.deepEqual(result.errors, {
    reason: '请填写修正原因',
    target: '份额和计算出的总成本必须同时为零或同时为正',
  })
})

test('accepts a historical correction date and converts total cost to cents', () => {
  assert.deepEqual(
    validateFundHoldingCorrectionDraft(
      {
        confirmedDate: '2026-08-17',
        holdingAmountYuan: '123.45',
        holdingIncomeYuan: '0',
        reason: '导入对账单',
        targetUnits: '12.3456',
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

test('calculates correction cost from holding amount and signed income', () => {
  assert.deepEqual(
    validateFundHoldingCorrectionDraft(
      {
        confirmedDate: '2026-08-19',
        holdingAmountYuan: '5250.66',
        holdingIncomeYuan: '-1149.34',
        reason: '导入银行对账单',
        targetUnits: '5424.24',
      },
      new Date(2026, 7, 20),
    ),
    {
      errors: {},
      input: {
        confirmedDate: '2026-08-19',
        reason: '导入银行对账单',
        targetUnits: 5424.24,
        totalCostCents: 640000,
      },
    },
  )
})
