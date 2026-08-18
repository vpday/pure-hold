import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundHoldingMetrics } from './fundHoldingMetrics.ts'
import {
  calculateFundHoldingStatistics,
  type FundHoldingStatisticsItem,
} from './fundHoldingStatistics.ts'
import { createTestFundSnapshot } from '../testing/createTestFundSnapshot.ts'

test('aggregates holding values and weighted income rates', () => {
  const first = createStatisticsItem({
    code: '161726',
    currentSnapshot: {
      ...createTestFundSnapshot('161726'),
      dailyChangePercent: 10,
      nav: 1.1,
      navDate: '2026-08-10',
    },
    holding: {
      code: '161726',
      dividendMode: 'cash',
      purchaseDate: '2026-08-01',
      totalCostCents: 10000,
      units: 100,
    },
    metrics: {
      confirmedNavDate: '2026-08-10',
      currentIncomeSource: 'actual',
      estimatedIncome: null,
      estimatedIncomePercent: null,
      holdingAmount: 110,
      holdingDays: 9,
      holdingIncome: 10,
      holdingIncomePercent: 10,
      todayIncome: 10,
      todayIncomePercent: 10,
      yesterdayIncome: 100 / 21,
      yesterdayIncomeDate: '2026-08-07',
      yesterdayIncomePercent: 5,
    },
    previousConfirmedSnapshot: {
      ...createTestFundSnapshot('161726'),
      dailyChangePercent: 5,
      nav: 1,
      navDate: '2026-08-07',
    },
  })
  const second = createStatisticsItem({
    code: '000001',
    currentSnapshot: {
      ...createTestFundSnapshot('000001'),
      estimatedChangePercent: 2,
      estimatedNav: 2.04,
      estimatedAt: '2026-08-10 14:30',
      nav: 2,
      navDate: '2026-08-07',
    },
    holding: {
      code: '000001',
      dividendMode: 'reinvest',
      purchaseDate: '2026-07-01',
      totalCostCents: 7500,
      units: 50,
    },
    metrics: {
      confirmedNavDate: '2026-08-07',
      currentIncomeSource: 'estimated',
      estimatedIncome: 2,
      estimatedIncomePercent: 2,
      holdingAmount: 100,
      holdingDays: 40,
      holdingIncome: 25,
      holdingIncomePercent: 33.3333333333,
      todayIncome: null,
      todayIncomePercent: null,
      yesterdayIncome: 0,
      yesterdayIncomeDate: '2026-08-07',
      yesterdayIncomePercent: 0,
    },
  })

  const statistics = calculateFundHoldingStatistics([first, second])

  assert.equal(statistics.holdingAmount, 210)
  assert.equal(statistics.currentIncome, 12)
  assert.equal(statistics.currentIncomeSource, 'mixed')
  assert.equal(statistics.currentIncomePercent, 6)
  assert.equal(statistics.holdingIncome, 35)
  assert.equal(statistics.holdingIncomePercent, 20)
  assert.equal(statistics.yesterdayIncome, 100 / 21)
  assert.ok(
    Math.abs((statistics.yesterdayIncomePercent ?? 0) - (100 / 21 / (100 / 1.05 + 100)) * 100) <
      0.0001,
  )
})

test('returns empty statistics when no item has usable values', () => {
  const item = createStatisticsItem({
    code: '161726',
    currentSnapshot: createTestFundSnapshot('161726'),
    holding: {
      code: '161726',
      dividendMode: 'cash',
      purchaseDate: '2026-08-01',
      totalCostCents: 10000,
      units: 100,
    },
    metrics: {
      confirmedNavDate: null,
      currentIncomeSource: 'none',
      estimatedIncome: null,
      estimatedIncomePercent: null,
      holdingAmount: null,
      holdingDays: null,
      holdingIncome: null,
      holdingIncomePercent: null,
      todayIncome: null,
      todayIncomePercent: null,
      yesterdayIncome: null,
      yesterdayIncomeDate: null,
      yesterdayIncomePercent: null,
    },
  })

  assert.deepEqual(calculateFundHoldingStatistics([item]), {
    currentIncome: null,
    currentIncomePercent: null,
    currentIncomeSource: 'none',
    holdingAmount: null,
    holdingIncome: null,
    holdingIncomePercent: null,
    yesterdayIncome: null,
    yesterdayIncomePercent: null,
  })
})

function createStatisticsItem(input: {
  readonly code: string
  readonly currentSnapshot: FundHoldingStatisticsItem['currentSnapshot']
  readonly holding: FundHoldingStatisticsItem['holding']
  readonly metrics: FundHoldingMetrics
  readonly previousConfirmedSnapshot?: FundHoldingStatisticsItem['previousConfirmedSnapshot']
}): FundHoldingStatisticsItem {
  return {
    ...input,
    today: '2026-08-10',
  }
}
