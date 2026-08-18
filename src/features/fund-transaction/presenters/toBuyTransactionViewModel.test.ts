import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CommitEventInput,
  PortfolioCoordinationResult,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { calculatePortfolio } from '@/domains/portfolio/services/calculatePortfolio.ts'
import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
import {
  completeBuyEventWithActualFacts,
  completeBuyEventWithExactNav,
  saveBuyDraft,
} from '../services/buyTransactionService.ts'
import { createBuyDraft } from '../models/buyDraft.ts'
import { toBuyTransactionViewModel } from './toBuyTransactionViewModel.ts'

test('maps settlement state, dates, confidence and hides estimated purchase fees', () => {
  const coordinator = createCoordinator()
  const draftResult = createBuyDraft(
    {
      entryMode: 'pending',
      fundCode: '161725',
      id: 'buy-view',
      purchaseFeePercent: 1,
      submittedAt: '2026-08-14 12:00',
      totalAmountYuan: '100',
    },
    { confirmationDays: 1, now: '2026-08-14T12:00:00.000Z' },
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return
  assert.equal(saveBuyDraft(coordinator, draftResult.draft).ok, true)

  const pending = toBuyTransactionViewModel(
    draftResult.draft,
    calculatePortfolio({
      asOfDate: '2026-08-14',
      currentNavByFund: {},
      events: coordinator.getPortfolio().events,
    }),
  )
  assert.equal(pending.statusText, '待确认')
  assert.equal(pending.navDateText, '2026-08-14')
  assert.equal(pending.expectedConfirmationDateText, '2026-08-17')
  assert.equal(pending.units.text, '--')
  assert.equal(pending.units.sourceText, '本地计算')
  assert.equal(pending.purchaseFee.text, '--')

  const completed = completeBuyEventWithExactNav(
    coordinator,
    draftResult.draft,
    { date: '2026-08-14', source: 'nav-history', unitNav: 2 },
    '2026-08-14T22:00:00.000Z',
  )
  assert.equal(completed.ok, true)
  const navReadyButPending = coordinator.getPortfolio().events[0]
  if (navReadyButPending?.kind !== 'buy') return
  const stillPending = toBuyTransactionViewModel(
    navReadyButPending,
    calculatePortfolio({
      asOfDate: '2026-08-14',
      currentNavByFund: {},
      events: coordinator.getPortfolio().events,
    }),
  )
  assert.equal(stillPending.statusText, '待确认')
  assert.equal(stillPending.unitNav.sourceText, '历史净值')

  const facts = completeBuyEventWithActualFacts(
    coordinator,
    navReadyButPending,
    {
      confirmedDate: '2026-08-14',
      units: { confidence: 'actual', source: 'platform', value: 49.5 },
    },
    '2026-08-14T23:00:00.000Z',
  )
  assert.equal(facts.ok, true)
  const settled = coordinator.getPortfolio().events[0]
  if (settled?.kind !== 'buy') return
  assert.equal(settled.expectedConfirmationDate, undefined)
  const ready = toBuyTransactionViewModel(
    settled,
    calculatePortfolio({ asOfDate: '2026-08-14', currentNavByFund: {}, events: [settled] }),
  )
  assert.equal(ready.statusText, '已确认，净值已获取')
  assert.equal(ready.units.text, '49.5000')
  assert.equal(ready.units.sourceText, '平台实际值')

  const actualEvent = {
    ...settled,
    purchaseFee: { confidence: 'actual', source: 'platform', value: 99 },
    unitNav: { confidence: 'actual', source: 'platform', value: 2 },
    units: { confidence: 'actual', source: 'platform', value: 49.5 },
  } as typeof settled
  const actual = toBuyTransactionViewModel(
    actualEvent,
    calculatePortfolio({ asOfDate: '2026-08-14', currentNavByFund: {}, events: [actualEvent] }),
  )
  assert.equal(actual.statusText, '已确认，净值已获取')
  assert.equal(actual.units.text, '49.5000')
  assert.equal(actual.units.sourceText, '平台实际值')
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
        partialPersistence: false,
        portfolio,
        retryable: false,
        status: 'synced',
      }
    },
    getPortfolio: () => portfolio,
  }
}
