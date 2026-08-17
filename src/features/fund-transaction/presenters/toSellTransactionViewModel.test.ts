import assert from 'node:assert/strict'
import test from 'node:test'

import { calculatePortfolio } from '@/domains/portfolio/services/calculatePortfolio.ts'
import type { PortfolioBuyEvent, PortfolioSellEvent } from '@/domains/portfolio/models/index.ts'
import { toSellTransactionViewModel } from './toSellTransactionViewModel.ts'

const buyOne: PortfolioBuyEvent = {
  auditedAt: '2026-08-01T00:00:00.000Z',
  confirmedDate: '2026-08-03',
  createdAt: '2026-08-01T00:00:00.000Z',
  entryMode: 'historical',
  fundCode: '161725',
  id: 'buy-one',
  kind: 'buy',
  navDate: '2026-08-03',
  purchaseFee: { confidence: 'actual', source: 'manual', value: 0 },
  purchaseFeeRate: { confidence: 'actual', source: 'manual', value: 0 },
  settlementStatus: 'settled',
  source: 'manual',
  submittedAt: '2026-08-01 12:00',
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
  navDate: '2026-08-05',
  totalAmount: { confidence: 'actual', source: 'manual', value: 75000 },
  unitNav: { confidence: 'actual', source: 'manual', value: 15 },
  units: { confidence: 'actual', source: 'manual', value: 50 },
  updatedAt: '2026-08-05T00:00:00.000Z',
}

const sell: PortfolioSellEvent = {
  auditedAt: '2026-08-14T00:00:00.000Z',
  confirmedDate: '2026-08-14',
  createdAt: '2026-08-14T00:00:00.000Z',
  entryMode: 'historical',
  fundCode: '161725',
  id: 'sell-view',
  kind: 'sell',
  navDate: '2026-08-14',
  netAmount: { confidence: 'unknown', source: 'manual', value: null },
  grossAmount: { confidence: 'unknown', source: 'formula', value: null },
  redemptionFee: { confidence: 'unknown', source: 'manual', value: null },
  requestedUnits: { confidence: 'actual', source: 'manual', value: 120 },
  settlementStatus: 'settled',
  source: 'manual',
  submittedAt: '2026-08-14 12:00',
  unitNav: { confidence: 'actual', source: 'manual', value: 20 },
  units: { confidence: 'actual', source: 'manual', value: 120 },
  updatedAt: '2026-08-14T00:00:00.000Z',
}

test('presents average-cost basis and incomplete redemption facts', () => {
  const calculation = calculatePortfolio({
    asOfDate: '2026-08-14',
    currentNavByFund: {},
    events: [buyOne, buyTwo, sell],
  })

  const viewModel = toSellTransactionViewModel(sell, calculation)
  assert.equal(viewModel.costBasisAmount.text, '¥1400.00')
  assert.equal('allocations' in viewModel, false)
  assert.equal(viewModel.grossAmount.text, '¥2400.00')
  assert.equal(viewModel.redemptionFee.confidence, 'unknown')
  assert.notEqual(viewModel.redemptionFee.text, '¥0.00')
  assert.equal(viewModel.realizedGainStatusText, '收益不完整')

  assert.equal(calculation.aggregates.length, 1)
  assert.equal(calculation.aggregates[0]?.units.value, 30)
  assert.equal(calculation.aggregates[0]?.costAmount.value, 35000)
})
