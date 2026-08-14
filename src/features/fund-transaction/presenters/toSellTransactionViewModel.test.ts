import assert from 'node:assert/strict'
import test from 'node:test'

import { calculatePortfolio } from '@/domains/portfolio/services/calculatePortfolio.ts'
import type { PortfolioBuyEvent, PortfolioSellEvent } from '@/domains/portfolio/models/index.ts'
import {
  toRemainingBatchViewModels,
  toSellTransactionViewModel,
} from './toSellTransactionViewModel.ts'

const buyOne: PortfolioBuyEvent = {
  auditedAt: '2026-08-01T00:00:00.000Z',
  confirmedDate: '2026-08-01',
  createdAt: '2026-08-01T00:00:00.000Z',
  fundCode: '161725',
  id: 'buy-one',
  kind: 'buy',
  purchaseFee: { confidence: 'actual', source: 'manual', value: 0 },
  purchaseFeeRate: { confidence: 'actual', source: 'manual', value: 0 },
  settlementStatus: 'settled',
  source: 'manual',
  totalAmount: { confidence: 'actual', source: 'manual', value: 100000 },
  unitNav: { confidence: 'actual', source: 'manual', value: 10 },
  units: { confidence: 'actual', source: 'manual', value: 100 },
  updatedAt: '2026-08-01T00:00:00.000Z',
}

const buyTwo: PortfolioBuyEvent = {
  ...buyOne,
  confirmedDate: '2026-08-05',
  createdAt: '2026-08-05T00:00:00.000Z',
  id: 'buy-two',
  totalAmount: { confidence: 'actual', source: 'manual', value: 75000 },
  unitNav: { confidence: 'actual', source: 'manual', value: 15 },
  units: { confidence: 'actual', source: 'manual', value: 50 },
  updatedAt: '2026-08-05T00:00:00.000Z',
}

const sell: PortfolioSellEvent = {
  auditedAt: '2026-08-14T00:00:00.000Z',
  confirmedDate: '2026-08-14',
  createdAt: '2026-08-14T00:00:00.000Z',
  fundCode: '161725',
  id: 'sell-view',
  kind: 'sell',
  settlementStatus: 'settled',
  source: 'manual',
  unitNav: { confidence: 'actual', source: 'manual', value: 20 },
  units: { confidence: 'actual', source: 'manual', value: 120 },
  updatedAt: '2026-08-14T00:00:00.000Z',
}

test('presents FIFO allocations, remaining batches and incomplete redemption facts', () => {
  const calculation = calculatePortfolio({
    asOfDate: '2026-08-14',
    currentNavByFund: {},
    events: [buyOne, buyTwo, sell],
  })

  const viewModel = toSellTransactionViewModel(sell, calculation)
  assert.equal(viewModel.allocations.length, 2)
  assert.equal(viewModel.allocations[0]?.units.text, '100.0000')
  assert.equal(viewModel.allocations[0]?.costAmount.text, '¥1000.00')
  assert.equal(viewModel.allocations[1]?.units.text, '20.0000')
  assert.equal(viewModel.allocations[1]?.costAmount.text, '¥300.00')
  assert.equal(viewModel.grossAmount.text, '¥2400.00')
  assert.equal(viewModel.redemptionFee.confidence, 'unknown')
  assert.notEqual(viewModel.redemptionFee.text, '¥0.00')
  assert.equal(viewModel.realizedGainStatusText, '收益不完整')

  const remaining = toRemainingBatchViewModels(calculation, '161725')
  assert.equal(remaining.length, 1)
  assert.equal(remaining[0]?.units.text, '30.0000')
  assert.equal(remaining[0]?.costAmount.text, '¥450.00')
  assert.equal(remaining[0]?.costAmount.sourceText, '手工录入')
})
