import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CommitEventInput,
  PortfolioCoordinationResult,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
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
  const coordinator = createCoordinator()
  const draftResult = createSellDraft(
    {
      ...input(),
    },
    { confirmationDays: 1, now: '2026-08-14T12:00:00.000Z' },
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return

  assert.equal(saveSellDraft(coordinator, draftResult.draft).ok, true)
  const saved = coordinator.getPortfolio().events[0]
  assert.equal(saved?.id, 'sell-same-event')
  if (saved?.kind !== 'sell') return

  const completed = completeSellEventWithActualFacts(
    coordinator,
    saved,
    {
      confirmedDate: '2026-08-14',
      netAmount: { confidence: 'actual', source: 'manual', value: 0 },
      units: { confidence: 'actual', source: 'manual', value: 120 },
    },
    '2026-08-14T13:00:00.000Z',
  )
  assert.equal(completed.ok, true)
  const updated = coordinator.getPortfolio().events[0]
  assert.equal(updated?.id, 'sell-same-event')
  assert.deepEqual(updated?.kind === 'sell' ? updated.netAmount : undefined, {
    confidence: 'actual',
    source: 'manual',
    value: 0,
  })
  assert.equal(updated?.kind === 'sell' ? updated.expectedConfirmationDate : undefined, undefined)
  assert.equal(updated?.updatedAt, '2026-08-14T13:00:00.000Z')
  assert.equal(coordinator.getPortfolio().events.length, 1)
})

function createCoordinator(): Pick<PortfolioCoordinator, 'commitEvent' | 'getPortfolio'> {
  let portfolio = createEmptyPortfolio()
  return {
    commitEvent(input: CommitEventInput): PortfolioCoordinationResult {
      const events = portfolio.events.some(({ id }) => id === input.event.id)
        ? portfolio.events.map((event) => (event.id === input.event.id ? input.event : event))
        : [...portfolio.events, input.event]
      portfolio = { ...portfolio, events }
      return {
        fundCode: input.event.fundCode,
        holding: null,
        ledger: null,
        ok: true,
        portfolio,
        retryable: false,
        status: 'synced',
      }
    },
    getPortfolio: () => portfolio,
  }
}
