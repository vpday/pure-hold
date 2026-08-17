import assert from 'node:assert/strict'
import test from 'node:test'

import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
import { createPortfolioStore } from '@/domains/portfolio/stores/createPortfolioStore.ts'
import { createSellDraft } from '../models/sellDraft.ts'
import { completeSellEventWithActualFacts, saveSellDraft } from './sellTransactionService.ts'

function input(overrides: Record<string, unknown> = {}) {
  return {
    entryMode: 'pending' as const,
    fundCode: '161725',
    id: 'sell-same-event',
    requestedUnits: '120',
    submittedAt: '2026-08-14 12:00',
    ...overrides,
  }
}

test('saves and completes the same sell event with actual receipt facts', () => {
  const store = createPortfolioStore(createEmptyPortfolio(), () => undefined)
  const draftResult = createSellDraft(
    {
      ...input(),
    },
    { confirmationDays: 1, now: '2026-08-14T12:00:00.000Z' },
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return

  assert.equal(saveSellDraft(store, draftResult.draft).ok, true)
  const saved = store.getPortfolio().events[0]
  assert.equal(saved?.id, 'sell-same-event')
  if (saved?.kind !== 'sell') return

  const completed = completeSellEventWithActualFacts(
    store,
    saved,
    {
      confirmedDate: '2026-08-14',
      netAmount: { confidence: 'actual', source: 'manual', value: 0 },
      units: { confidence: 'actual', source: 'manual', value: 120 },
    },
    '2026-08-14T13:00:00.000Z',
  )
  assert.equal(completed.ok, true)
  const updated = store.getPortfolio().events[0]
  assert.equal(updated?.id, 'sell-same-event')
  assert.deepEqual(updated?.kind === 'sell' ? updated.netAmount : undefined, {
    confidence: 'actual',
    source: 'manual',
    value: 0,
  })
  assert.equal(updated?.kind === 'sell' ? updated.expectedConfirmationDate : undefined, undefined)
  assert.equal(updated?.updatedAt, '2026-08-14T13:00:00.000Z')
  assert.equal(store.getPortfolio().events.length, 1)
})
