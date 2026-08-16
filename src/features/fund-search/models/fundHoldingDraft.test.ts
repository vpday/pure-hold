import assert from 'node:assert/strict'
import test from 'node:test'

import { createFundHoldingDrafts, validateFundHoldingDrafts } from './fundHoldingDraft.ts'

test('validates every holding before creating atomic additions', () => {
  const drafts = createFundHoldingDrafts([
    { code: '000001', name: '一号' },
    { code: '000002', name: '二号' },
  ]).map((draft) => ({ ...draft }))
  Object.assign(drafts[0]!.holding, {
    costPrice: '1.2345',
    dividendMode: 'reinvest',
    purchaseDate: '2026-07-27',
    units: '100',
  })
  Object.assign(drafts[1]!.holding, {
    costPrice: '0',
    dividendMode: '',
    holdingDays: '2',
    timeMode: 'days',
    units: '1.23456',
  })

  const invalid = validateFundHoldingDrafts(drafts, new Date(2026, 6, 27))
  assert.equal(invalid.additions, undefined)
  assert.deepEqual(Object.keys(invalid.errors), ['000002'])

  Object.assign(drafts[1]!.holding, {
    costPrice: '2',
    dividendMode: 'cash',
    units: '1.2345',
  })
  const valid = validateFundHoldingDrafts(drafts, new Date(2026, 6, 27))
  assert.deepEqual(
    valid.additions?.map(({ holding }) => holding),
    [
      {
        code: '000001',
        costPrice: 1.2345,
        dividendMode: 'reinvest',
        purchaseDate: '2026-07-27',
        units: 100,
      },
      {
        code: '000002',
        costPrice: 2,
        dividendMode: 'cash',
        purchaseDate: '2026-07-25',
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
      costPrice: '1',
      dividendMode: 'cash' as const,
      units: '1',
    },
  }))
  for (const purchaseDate of ['2026-07-28', '2026-02-30', '']) {
    draft!.holding.purchaseDate = purchaseDate
    assert.equal(validateFundHoldingDrafts([draft!], new Date(2026, 6, 27)).additions, undefined)
  }
})
