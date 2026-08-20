import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEmptyFundHoldingDraft,
  createFundHoldingDraft,
  holdingDaysFromPurchaseDate,
  purchaseDateFromHoldingDays,
  validateFundHoldingDraft,
} from './fundHoldingDraft.ts'

test('empty and existing holding drafts preserve the form contract', () => {
  assert.deepEqual(createEmptyFundHoldingDraft(), {
    dividendMode: 'cash',
    holdingAmountYuan: '',
    holdingDays: '',
    holdingIncomeYuan: '',
    purchaseDate: '',
    timeMode: 'date',
    units: '',
  })
  assert.deepEqual(
    createFundHoldingDraft(
      {
        code: '000001',
        dividendMode: 'reinvest',
        purchaseDate: '2020-02-29',
        totalCostCents: 12345,
        units: 100.5,
      },
      1.5,
    ),
    {
      dividendMode: 'reinvest',
      holdingAmountYuan: '150.75',
      holdingDays: '',
      holdingIncomeYuan: '27.30',
      purchaseDate: '2020-02-29',
      timeMode: 'date',
      units: '100.5',
    },
  )
})

test('holding days use local calendar subtraction across boundaries', () => {
  assert.equal(purchaseDateFromHoldingDays('1', new Date(2026, 6, 27)), '2026-07-26')
  assert.equal(purchaseDateFromHoldingDays('1', new Date(2026, 2, 1)), '2026-02-28')
  assert.equal(purchaseDateFromHoldingDays('1', new Date(2026, 0, 1)), '2025-12-31')
  assert.equal(purchaseDateFromHoldingDays('1', new Date(2024, 2, 1)), '2024-02-29')
  for (const value of ['', '0', '-1', '1.5', '+1']) {
    assert.equal(purchaseDateFromHoldingDays(value), undefined)
  }
})

test('holding days use local calendar subtraction in the opposite direction', () => {
  assert.equal(holdingDaysFromPurchaseDate('2026-07-25', new Date(2026, 6, 27)), '2')
  assert.equal(holdingDaysFromPurchaseDate('2026-02-28', new Date(2026, 2, 1)), '1')
  assert.equal(holdingDaysFromPurchaseDate('2024-02-29', new Date(2024, 2, 1)), '1')
  for (const value of ['', '2026-07-27', '2026-07-28', '2026-02-30']) {
    assert.equal(holdingDaysFromPurchaseDate(value, new Date(2026, 6, 27)), undefined)
  }
})

test('validates fields and returns a complete holding', () => {
  const draft = createEmptyFundHoldingDraft()
  assert.deepEqual(validateFundHoldingDraft('000001', draft).errors, {
    holdingAmountYuan: '请输入大于 0、最多 2 位小数的持仓金额',
    holdingIncomeYuan: '请输入可带负号、最多 2 位小数的持仓收益',
    time: '请选择早于今天且非周末的购买日期',
    units: '请输入大于 0、最多 4 位小数的份额',
  })

  Object.assign(draft, {
    holdingAmountYuan: '1.23',
    holdingIncomeYuan: '0',
    dividendMode: 'cash',
    holdingDays: '3',
    timeMode: 'days',
    units: '100',
  })
  assert.deepEqual(validateFundHoldingDraft('000001', draft, new Date(2026, 6, 27)), {
    errors: {},
    holding: {
      code: '000001',
      dividendMode: 'cash',
      purchaseDate: '2026-07-24',
      totalCostCents: 123,
      units: 100,
    },
  })
})

test('rejects excessive precision and invalid or future dates', () => {
  const draft = {
    ...createEmptyFundHoldingDraft(),
    dividendMode: 'reinvest' as const,
    holdingAmountYuan: '1.23',
    holdingIncomeYuan: '0',
    units: '1.23456',
  }
  for (const purchaseDate of ['2026-07-28', '2026-07-27', '2026-07-26', '2026-02-30', '']) {
    draft.purchaseDate = purchaseDate
    assert.equal(
      validateFundHoldingDraft('000001', draft, new Date(2026, 6, 27)).holding,
      undefined,
    )
  }
})

test('rejects zero days and day values that resolve to weekends', () => {
  const draft = {
    ...createEmptyFundHoldingDraft(),
    dividendMode: 'cash' as const,
    holdingAmountYuan: '1',
    holdingIncomeYuan: '0',
    timeMode: 'days' as const,
    units: '1',
  }
  for (const holdingDays of ['0', '1', '2']) {
    draft.holdingDays = holdingDays
    assert.equal(
      validateFundHoldingDraft('000001', draft, new Date(2026, 6, 27)).holding,
      undefined,
    )
  }
})

test('accepts positive four-decimal boundaries and rejects non-positive values', () => {
  const valid = {
    ...createEmptyFundHoldingDraft(),
    dividendMode: 'cash' as const,
    purchaseDate: '2026-07-24',
    holdingAmountYuan: '0.01',
    holdingIncomeYuan: '0',
    units: '1.2345',
  }
  assert.equal(
    validateFundHoldingDraft('000001', valid, new Date(2026, 6, 27)).holding?.units,
    1.2345,
  )

  for (const value of ['0', '0.00001']) {
    assert.equal(
      validateFundHoldingDraft(
        '000001',
        { ...valid, holdingAmountYuan: value },
        new Date(2026, 6, 27),
      ).holding,
      undefined,
    )
  }
})

test('calculates total cost from holding amount and signed income', () => {
  const result = validateFundHoldingDraft(
    '014674',
    {
      ...createEmptyFundHoldingDraft(),
      holdingAmountYuan: '7908.02',
      holdingIncomeYuan: '-2961.98',
      purchaseDate: '2026-08-19',
      units: '11778.41',
    },
    new Date(2026, 7, 20),
  )

  assert.equal(result.holding?.totalCostCents, 1_087_000)
})
