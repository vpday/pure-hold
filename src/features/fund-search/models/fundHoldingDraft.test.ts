import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createFundHoldingDrafts,
  purchaseDateFromHoldingDays,
  validateFundHoldingDrafts,
} from './fundHoldingDraft.ts'

test('holding days use local calendar subtraction across month, year and leap day', () => {
  assert.equal(purchaseDateFromHoldingDays('1', new Date(2026, 6, 27)), '2026-07-26')
  assert.equal(purchaseDateFromHoldingDays('1', new Date(2026, 2, 1)), '2026-02-28')
  assert.equal(purchaseDateFromHoldingDays('1', new Date(2026, 0, 1)), '2025-12-31')
  assert.equal(purchaseDateFromHoldingDays('1', new Date(2024, 2, 1)), '2024-02-29')
  for (const value of ['', '0', '-1', '1.5', '+1']) {
    assert.equal(purchaseDateFromHoldingDays(value), undefined)
  }
})

test('validates every holding before creating atomic additions', () => {
  const drafts = createFundHoldingDrafts([
    { code: '000001', name: '一号' },
    { code: '000002', name: '二号' },
  ]).map((draft) => ({ ...draft }))
  Object.assign(drafts[0]!, {
    costPrice: '1.2345',
    purchaseDate: '2026-07-26',
    units: '100',
  })
  Object.assign(drafts[1]!, {
    costPrice: '0',
    holdingDays: '2',
    timeMode: 'days',
    units: '1.23456',
  })

  const invalid = validateFundHoldingDrafts(drafts, new Date(2026, 6, 27))
  assert.equal(invalid.additions, undefined)
  assert.deepEqual(Object.keys(invalid.errors), ['000002'])

  Object.assign(drafts[1]!, { costPrice: '2', units: '1.2345' })
  const valid = validateFundHoldingDrafts(drafts, new Date(2026, 6, 27))
  assert.deepEqual(
    valid.additions?.map(({ holding }) => holding),
    [
      { code: '000001', costPrice: 1.2345, purchaseDate: '2026-07-26', units: 100 },
      { code: '000002', costPrice: 2, purchaseDate: '2026-07-25', units: 1.2345 },
    ],
  )
})

test('rejects future and impossible purchase dates', () => {
  const [draft] = createFundHoldingDrafts([{ code: '000001', name: '一号' }]).map((value) => ({
    ...value,
    costPrice: '1',
    units: '1',
  }))
  for (const purchaseDate of ['2026-07-28', '2026-02-30', '']) {
    draft!.purchaseDate = purchaseDate
    assert.equal(validateFundHoldingDrafts([draft!], new Date(2026, 6, 27)).additions, undefined)
  }
})
