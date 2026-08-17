import assert from 'node:assert/strict'
import test from 'node:test'

import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
import { createPortfolioStore } from '@/domains/portfolio/stores/createPortfolioStore.ts'
import { createBuyDraft } from '../models/buyDraft.ts'
import { completeBuyEventWithExactNav, saveBuyDraft } from './buyTransactionService.ts'

const options = { confirmationDays: 1, now: '2026-08-14T12:00:00.000Z' }

function input(overrides: Record<string, unknown> = {}) {
  return {
    entryMode: 'pending' as const,
    fundCode: '161725',
    id: 'buy-same-event',
    purchaseFeePercent: 1,
    submittedAt: '2026-08-14 12:00',
    totalAmountYuan: '100.00',
    ...overrides,
  }
}

test('saves and completes the same buy event with an exact same-day NAV', () => {
  const store = createPortfolioStore(createEmptyPortfolio(), () => undefined)
  const draftResult = createBuyDraft(
    {
      ...input({
        actualUnits: '49.5',
        confirmedDate: '2026-08-14',
      }),
    },
    options,
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
      ...input({ id: 'buy-pending', totalAmountYuan: '100' }),
    },
    options,
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
      ...input({ id: 'buy-write-failure', totalAmountYuan: '100' }),
    },
    options,
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return

  const result = saveBuyDraft(store, draftResult.draft)

  assert.equal(result.ok, false)
  assert.deepEqual(store.getPortfolio(), createEmptyPortfolio())
  assert.equal(draftResult.draft.settlementStatus, 'pending-settlement')
})
