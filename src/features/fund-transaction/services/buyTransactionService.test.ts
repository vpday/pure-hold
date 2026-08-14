import assert from 'node:assert/strict'
import test from 'node:test'

import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
import { createPortfolioStore } from '@/domains/portfolio/stores/createPortfolioStore.ts'
import { createBuyDraft } from '../models/buyDraft.ts'
import { completeBuyEventWithExactNav, saveBuyDraft } from './buyTransactionService.ts'

test('saves and completes the same buy event with an exact same-day NAV', () => {
  const store = createPortfolioStore(createEmptyPortfolio(), () => undefined)
  const draftResult = createBuyDraft(
    {
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'buy-same-event',
      purchaseFeePercent: 1,
      totalAmountYuan: '100.00',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return

  assert.equal(saveBuyDraft(store, draftResult.draft).ok, true)
  const first = completeBuyEventWithExactNav(
    store,
    draftResult.draft,
    { date: '2026-08-14', source: 'nav-history', unitNav: 2 },
    '2026-08-14T22:00:00.000Z',
  )
  assert.equal(first.ok, true)
  const saved = store.getPortfolio().events[0]
  assert.equal(saved?.id, 'buy-same-event')
  assert.equal(saved?.kind, 'buy')
  if (saved?.kind !== 'buy') return
  assert.equal(saved.settlementStatus, 'settled')
  assert.deepEqual(saved.unitNav, { confidence: 'actual', source: 'nav-history', value: 2 })

  const repeated = completeBuyEventWithExactNav(
    store,
    saved,
    { date: '2026-08-14', source: 'nav-history', unitNav: 2 },
    '2026-08-14T22:00:00.000Z',
  )
  assert.equal(repeated.ok, true)
  assert.equal(store.getPortfolio().events.length, 1)
})

test('does not update a saved event when exact NAV completion fails', () => {
  const store = createPortfolioStore(createEmptyPortfolio(), () => undefined)
  const draftResult = createBuyDraft(
    {
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'buy-pending',
      purchaseFeePercent: 1,
      totalAmountYuan: '100',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return
  assert.equal(saveBuyDraft(store, draftResult.draft).ok, true)

  const result = completeBuyEventWithExactNav(
    store,
    draftResult.draft,
    { date: '2026-08-13', source: 'nav-history', unitNav: 2 },
    '2026-08-14T22:00:00.000Z',
  )

  assert.deepEqual(result, { ok: false, reason: 'exact-nav-mismatch' })
  assert.equal(store.getPortfolio().events[0]?.settlementStatus, 'pending-settlement')
})

test('keeps the draft and old portfolio state when persistence fails', () => {
  const store = createPortfolioStore(createEmptyPortfolio(), () => {
    throw new Error('storage failed')
  })
  const draftResult = createBuyDraft(
    {
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'buy-write-failure',
      purchaseFeePercent: 1,
      totalAmountYuan: '100',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return

  const result = saveBuyDraft(store, draftResult.draft)

  assert.equal(result.ok, false)
  assert.deepEqual(store.getPortfolio(), createEmptyPortfolio())
  assert.equal(draftResult.draft.settlementStatus, 'pending-settlement')
})
