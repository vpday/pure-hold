import assert from 'node:assert/strict'
import test from 'node:test'

import { createCoordinationFailureFact } from '@/app/coordination/coordinationFailure.ts'
import type {
  CommitEventInput,
  PortfolioCoordinationResult,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
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
  const coordinator = createCoordinator()
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

  assert.equal(saveBuyDraft(coordinator, draftResult.draft).ok, true)
  const first = completeBuyEventWithExactNav(
    coordinator,
    draftResult.draft,
    { date: '2026-08-14', source: 'nav-history', unitNav: 2 },
    '2026-08-14T22:00:00.000Z',
  )
  assert.equal(first.ok, true)
  const saved = coordinator.getPortfolio().events[0]
  assert.equal(saved?.id, 'buy-same-event')
  assert.equal(saved?.kind, 'buy')
  if (saved?.kind !== 'buy') return
  assert.equal(saved.settlementStatus, 'settled')
  assert.deepEqual(saved.unitNav, { confidence: 'actual', source: 'nav-history', value: 2 })

  const repeated = completeBuyEventWithExactNav(
    coordinator,
    saved,
    { date: '2026-08-14', source: 'nav-history', unitNav: 2 },
    '2026-08-14T22:00:00.000Z',
  )
  assert.equal(repeated.ok, true)
  assert.equal(coordinator.getPortfolio().events.length, 1)
})

test('does not update a saved event when exact NAV completion fails', () => {
  const coordinator = createCoordinator()
  const draftResult = createBuyDraft(
    {
      ...input({ id: 'buy-pending', totalAmountYuan: '100' }),
    },
    options,
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return
  assert.equal(saveBuyDraft(coordinator, draftResult.draft).ok, true)

  const result = completeBuyEventWithExactNav(
    coordinator,
    draftResult.draft,
    { date: '2026-08-13', source: 'nav-history', unitNav: 2 },
    '2026-08-14T22:00:00.000Z',
  )

  assert.deepEqual(result, { ok: false, reason: 'exact-nav-mismatch' })
  assert.equal(coordinator.getPortfolio().events[0]?.settlementStatus, 'pending-settlement')
})

test('keeps the draft and old portfolio state when persistence fails', () => {
  const coordinator = createCoordinator(true)
  const draftResult = createBuyDraft(
    {
      ...input({ id: 'buy-write-failure', totalAmountYuan: '100' }),
    },
    options,
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return

  const result = saveBuyDraft(coordinator, draftResult.draft)

  assert.equal(result.ok, false)
  assert.deepEqual(coordinator.getPortfolio(), createEmptyPortfolio())
  assert.equal(draftResult.draft.settlementStatus, 'pending-settlement')
})

function createCoordinator(
  fail = false,
): Pick<PortfolioCoordinator, 'commitEvent' | 'getPortfolio'> {
  let portfolio = createEmptyPortfolio()
  const persistenceError = new Error('storage failed')
  return {
    commitEvent(input: CommitEventInput): PortfolioCoordinationResult {
      if (fail) {
        return {
          failure: createCoordinationFailureFact('unchanged', persistenceError),
          fundCode: input.event.fundCode,
          holding: null,
          ledger: null,
          ok: false,
          portfolio,
          retryable: true,
          status: 'portfolio-persistence-failed',
        }
      }
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
