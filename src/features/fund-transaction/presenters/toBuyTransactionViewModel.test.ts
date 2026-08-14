import assert from 'node:assert/strict'
import test from 'node:test'

import { calculatePortfolio } from '@/domains/portfolio/services/calculatePortfolio.ts'
import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
import { createPortfolioStore } from '@/domains/portfolio/stores/createPortfolioStore.ts'
import { completeBuyEventWithExactNav, saveBuyDraft } from '../services/buyTransactionService.ts'
import { createBuyDraft } from '../models/buyDraft.ts'
import { toBuyTransactionViewModel } from './toBuyTransactionViewModel.ts'

test('maps pending, estimated and actual buy fields with confidence and source', () => {
  const store = createPortfolioStore(createEmptyPortfolio(), () => undefined)
  const draftResult = createBuyDraft(
    {
      confirmedDate: '2026-08-14',
      fundCode: '161725',
      id: 'buy-view',
      purchaseFeePercent: 1,
      totalAmountYuan: '100',
    },
    { now: '2026-08-14T12:00:00.000Z', today: '2026-08-14' },
  )
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return
  assert.equal(saveBuyDraft(store, draftResult.draft).ok, true)

  const pending = toBuyTransactionViewModel(
    draftResult.draft,
    store.calculate({ asOfDate: '2026-08-14', currentNavByFund: {} }),
  )
  assert.equal(pending.statusText, '待结算')
  assert.equal(pending.units.text, '--')
  assert.equal(pending.units.sourceText, '本地计算')

  const completed = completeBuyEventWithExactNav(
    store,
    draftResult.draft,
    { date: '2026-08-14', source: 'nav-history', unitNav: 2 },
    '2026-08-14T22:00:00.000Z',
  )
  assert.equal(completed.ok, true)
  const settled = store.getPortfolio().events[0]
  if (settled?.kind !== 'buy') return
  const estimated = toBuyTransactionViewModel(
    settled,
    store.calculate({ asOfDate: '2026-08-14', currentNavByFund: {} }),
  )
  assert.equal(estimated.statusText, '估算')
  assert.equal(estimated.units.text, '49.5050')
  assert.equal(estimated.units.sourceText, '本地计算')
  assert.equal(estimated.unitNav.sourceText, '历史净值')

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
  assert.equal(actual.statusText, '实际')
  assert.equal(actual.units.text, '49.5000')
  assert.equal(actual.units.sourceText, '平台实际值')
})
