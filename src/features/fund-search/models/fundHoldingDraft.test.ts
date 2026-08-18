import assert from 'node:assert/strict'
import test from 'node:test'

import { createFundHoldingDrafts, validateFundHoldingDrafts } from './fundHoldingDraft.ts'

test('validates every holding before creating atomic additions', () => {
  const drafts = createFundHoldingDrafts([
    { code: '000001', name: '一号' },
    { code: '000002', name: '二号' },
  ]).map((draft) => ({ ...draft }))
  Object.assign(drafts[0]!.holding, {
    dividendMode: 'reinvest',
    purchaseDate: '2026-07-27',
    totalCostYuan: '1.23',
    units: '100',
  })
  Object.assign(drafts[1]!.holding, {
    totalCostYuan: '0',
    holdingDays: '2',
    timeMode: 'days',
    units: '1.23456',
  })

  const invalid = validateFundHoldingDrafts(drafts, new Date(2026, 6, 27))
  assert.equal(invalid.additions, undefined)
  assert.deepEqual(Object.keys(invalid.errors), ['000002'])

  Object.assign(drafts[1]!.holding, {
    totalCostYuan: '2',
    dividendMode: 'cash',
    units: '1.2345',
  })
  const valid = validateFundHoldingDrafts(drafts, new Date(2026, 6, 27))
  assert.deepEqual(
    valid.additions?.map(({ holding }) => holding),
    [
      {
        code: '000001',
        dividendMode: 'reinvest',
        purchaseDate: '2026-07-27',
        totalCostCents: 123,
        units: 100,
      },
      {
        code: '000002',
        dividendMode: 'cash',
        purchaseDate: '2026-07-25',
        totalCostCents: 200,
        units: 1.2345,
      },
    ],
  )
})

test('rejects future and impossible purchase dates', () => {
  const [draft] = createFundHoldingDrafts([{ code: '000001', name: '一号' }]).map((value) => ({
    ...value,
    holding: {
      ...value.holding,
      dividendMode: 'cash' as const,
      totalCostYuan: '1',
      units: '1',
    },
  }))
  for (const purchaseDate of ['2026-07-28', '2026-02-30', '']) {
    draft!.holding.purchaseDate = purchaseDate
    assert.equal(validateFundHoldingDrafts([draft!], new Date(2026, 6, 27)).additions, undefined)
  }
})
