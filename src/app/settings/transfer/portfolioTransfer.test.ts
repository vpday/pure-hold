import assert from 'node:assert/strict'
import test from 'node:test'

import type { Portfolio } from '@/domains/portfolio/models/index.ts'
import { createPortfolioStore } from '@/domains/portfolio/stores/index.ts'
import { createPortfolioTransferAdapter } from './portfolioTransfer.ts'

const initialPortfolio: Portfolio = {
  events: [
    {
      auditedAt: '2026-08-14T09:00:00.000Z',
      confirmedDate: '2024-01-01',
      costAmount: { confidence: 'actual', source: 'migration', value: 12000 },
      createdAt: '2026-08-14T09:00:00.000Z',
      fundCode: '000001',
      id: 'initial-holding:000001',
      kind: 'initial-holding',
      settlementStatus: 'settled',
      source: 'initial-holding',
      units: { confidence: 'actual', source: 'migration', value: 100 },
      updatedAt: '2026-08-14T09:00:00.000Z',
    },
  ],
  fundCodes: ['000001'],
}

function createStore(
  initial: Portfolio = initialPortfolio,
  writer: (portfolio: Portfolio) => void = () => {},
) {
  return createPortfolioStore(initial, writer)
}

test('portfolio transfer replacement overwrites the existing snapshot', () => {
  const store = createStore()
  const adapter = createPortfolioTransferAdapter(store)
  const replacement: Portfolio = {
    events: initialPortfolio.events.map((event) => ({
      ...event,
      auditedAt: '2026-08-15T09:00:00.000Z',
    })),
    fundCodes: ['000002'],
  }

  assert.deepEqual(adapter.replace(replacement), { ok: true })
  assert.deepEqual(store.getPortfolio(), replacement)
})

test('portfolio transfer replacement reports partial persistence when rollback fails', () => {
  let writes = 0
  const store = createStore(initialPortfolio, () => {
    writes += 1
    if (writes >= 2) throw new Error('quota exceeded')
  })
  const adapter = createPortfolioTransferAdapter(store)
  const replacement: Portfolio = { events: [], fundCodes: ['000002'] }

  const result = adapter.replace(replacement)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.failure.persistence, 'partial')
})
