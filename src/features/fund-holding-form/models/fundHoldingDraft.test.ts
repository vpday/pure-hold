import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEmptyFundHoldingDraft,
  createFundHoldingDraft,
  purchaseDateFromHoldingDays,
  validateFundHoldingDraft,
} from './fundHoldingDraft.ts'

test('empty and existing holding drafts preserve the form contract', () => {
  assert.deepEqual(createEmptyFundHoldingDraft(), {
    costPrice: '',
    dividendMode: '',
    holdingDays: '',
    purchaseDate: '',
    timeMode: 'date',
    units: '',
  })
  assert.deepEqual(
    createFundHoldingDraft({
      code: '000001',
      costPrice: 1.2345,
      dividendMode: 'reinvest',
      purchaseDate: '2020-02-29',
      units: 100.5,
    }),
    {
      costPrice: '1.2345',
      dividendMode: 'reinvest',
      holdingDays: '',
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

test('validates fields and returns a complete holding', () => {
  const draft = createEmptyFundHoldingDraft()
  assert.deepEqual(validateFundHoldingDraft('000001', draft).errors, {
    costPrice: '请输入大于 0、最多 4 位小数的成本价',
    dividendMode: '请选择分红方式',
    time: '请选择不晚于今天且非周末的购买日期',
    units: '请输入大于 0、最多 4 位小数的份额',
  })

  Object.assign(draft, {
    costPrice: '1.2345',
    dividendMode: 'cash',
    holdingDays: '1',
    timeMode: 'days',
    units: '100',
  })
  assert.deepEqual(validateFundHoldingDraft('000001', draft, new Date(2026, 6, 27)), {
    errors: {},
    holding: {
      code: '000001',
      costPrice: 1.2345,
      dividendMode: 'cash',
      purchaseDate: '2026-07-26',
      units: 100,
    },
  })
})

test('rejects excessive precision and invalid or future dates', () => {
  const draft = {
    ...createEmptyFundHoldingDraft(),
    costPrice: '1',
    dividendMode: 'reinvest' as const,
    units: '1.23456',
  }
  for (const purchaseDate of ['2026-07-28', '2026-07-26', '2026-02-30', '']) {
    draft.purchaseDate = purchaseDate
    assert.equal(
      validateFundHoldingDraft('000001', draft, new Date(2026, 6, 27)).holding,
      undefined,
    )
  }
})

test('accepts positive four-decimal boundaries and rejects non-positive values', () => {
  const valid = {
    ...createEmptyFundHoldingDraft(),
    costPrice: '0.0001',
    dividendMode: 'cash' as const,
    purchaseDate: '2026-07-27',
    units: '1.2345',
  }
  assert.equal(
    validateFundHoldingDraft('000001', valid, new Date(2026, 6, 27)).holding?.units,
    1.2345,
  )

  for (const value of ['0', '0.00001']) {
    assert.equal(
      validateFundHoldingDraft('000001', { ...valid, costPrice: value }, new Date(2026, 6, 27))
        .holding,
      undefined,
    )
  }
})
