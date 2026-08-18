import assert from 'node:assert/strict'
import test from 'node:test'

import { createTestFundSnapshot } from '../testing/createTestFundSnapshot.ts'
import { calculateFundHoldingMetrics } from './fundHoldingMetrics.ts'

test('calculates confirmed current-day and cumulative holding income', () => {
  const metrics = calculateFundHoldingMetrics({
    currentSnapshot: {
      ...createTestFundSnapshot('161726'),
      dailyChangePercent: 50,
      estimatedAt: '2026-08-10 14:30',
      estimatedChangePercent: 60,
      estimatedNav: 1.6,
      nav: 1.5,
      navDate: '2026-08-10',
    },
    holding: {
      code: '161726',
      dividendMode: 'reinvest',
      purchaseDate: '2026-08-10',
      totalCostCents: 10000,
      units: 100,
    },
    today: '2026-08-10',
  })

  assert.equal(metrics.currentIncomeSource, 'actual')
  assert.equal(metrics.todayIncome, 50)
  assert.equal(metrics.todayIncomePercent, 50)
  assert.equal(metrics.estimatedIncome, null)
  assert.equal(metrics.holdingAmount, 150)
  assert.equal(metrics.holdingIncome, 50)
  assert.equal(metrics.holdingIncomePercent, 50)
  assert.equal(metrics.holdingDays, 0)
  assert.equal(metrics.yesterdayIncome, null)
})

test('derives cumulative cost from exact cents instead of a rounded average price', () => {
  const metrics = calculateFundHoldingMetrics({
    currentSnapshot: {
      ...createTestFundSnapshot('161726'),
      nav: 1.5,
      navDate: '2026-08-10',
    },
    holding: {
      code: '161726',
      costPrice: 1,
      dividendMode: 'cash',
      purchaseDate: '2026-08-01',
      totalCostCents: 12_345,
      units: 100,
    },
    today: '2026-08-10',
  })

  assert.ok(Math.abs((metrics.holdingIncome ?? 0) - 26.55) < 0.000001)
  assert.ok(Math.abs((metrics.holdingIncomePercent ?? 0) - (26.55 / 123.45) * 100) < 0.000001)
})

test('uses only a current Shanghai-day estimate before confirmed NAV arrives', () => {
  const metrics = calculateFundHoldingMetrics({
    currentSnapshot: {
      ...createTestFundSnapshot('161726'),
      estimatedAt: '2026/08/10 14:30:00',
      estimatedChangePercent: 50,
      estimatedNav: 1.5,
      nav: 1,
      navDate: '2026-08-07',
    },
    holding: {
      code: '161726',
      dividendMode: 'cash',
      purchaseDate: '2026-08-01',
      totalCostCents: 10000,
      units: 100,
    },
    today: '2026-08-10',
  })

  assert.equal(metrics.currentIncomeSource, 'estimated')
  assert.equal(metrics.estimatedIncome, 50)
  assert.equal(metrics.estimatedIncomePercent, 50)
  assert.equal(metrics.todayIncome, null)
  assert.equal(metrics.holdingDays, 9)
})

test('keeps the previous confirmed trading-day income after current NAV arrives', () => {
  const previousConfirmedSnapshot = {
    ...createTestFundSnapshot('161726'),
    dailyChangePercent: 50,
    nav: 1.5,
    navDate: '2026-08-07',
  }
  const metrics = calculateFundHoldingMetrics({
    currentSnapshot: {
      ...previousConfirmedSnapshot,
      dailyChangePercent: 10,
      nav: 1.65,
      navDate: '2026-08-10',
    },
    holding: {
      code: '161726',
      dividendMode: 'cash',
      purchaseDate: '2026-08-01',
      totalCostCents: 10000,
      units: 100,
    },
    previousConfirmedSnapshot,
    today: '2026-08-10',
  })

  assert.equal(metrics.yesterdayIncome, 50)
  assert.equal(metrics.yesterdayIncomePercent, 50)
  assert.equal(metrics.yesterdayIncomeDate, '2026-08-07')
})

test('does not produce holding values from invalid NAV, units or cost inputs', () => {
  const metrics = calculateFundHoldingMetrics({
    currentSnapshot: {
      ...createTestFundSnapshot('161726'),
      dailyChangePercent: 1,
      nav: 1,
      navDate: '2026-08-10',
    },
    holding: {
      code: '161726',
      dividendMode: 'cash',
      purchaseDate: 'invalid',
      totalCostCents: 0,
      units: -100,
    },
    today: '2026-08-10',
  })

  assert.equal(metrics.todayIncome, null)
  assert.equal(metrics.holdingAmount, null)
  assert.equal(metrics.holdingIncome, null)
  assert.equal(metrics.holdingIncomePercent, null)
  assert.equal(metrics.holdingDays, null)
})

test('uses the latest confirmed snapshot as yesterday on a non-trading day', () => {
  const metrics = calculateFundHoldingMetrics({
    currentSnapshot: {
      ...createTestFundSnapshot('161726'),
      dailyChangePercent: 50,
      estimatedAt: '2026-08-07 15:00',
      estimatedChangePercent: 60,
      estimatedNav: 1.6,
      nav: 1.5,
      navDate: '2026-08-07',
    },
    holding: {
      code: '161726',
      dividendMode: 'cash',
      purchaseDate: '2026-08-01',
      totalCostCents: 10000,
      units: 100,
    },
    today: '2026-08-10',
  })

  assert.equal(metrics.currentIncomeSource, 'none')
  assert.equal(metrics.todayIncome, null)
  assert.equal(metrics.estimatedIncome, null)
  assert.equal(metrics.yesterdayIncome, 50)
  assert.equal(metrics.yesterdayIncomeDate, '2026-08-07')
})

test('derives an estimate percentage only when the provider percentage is missing', () => {
  const metrics = calculateFundHoldingMetrics({
    currentSnapshot: {
      ...createTestFundSnapshot('161726'),
      estimatedAt: '2026-08-10 14:30',
      estimatedNav: 1.5,
      nav: 1,
      navDate: '2026-08-07',
    },
    holding: {
      code: '161726',
      dividendMode: 'reinvest',
      purchaseDate: '2026-08-01',
      totalCostCents: 10000,
      units: 100,
    },
    today: '2026-08-10',
  })

  assert.equal(metrics.estimatedIncomePercent, 50)
})

test('rejects a daily change that makes the previous NAV denominator zero', () => {
  const metrics = calculateFundHoldingMetrics({
    currentSnapshot: {
      ...createTestFundSnapshot('161726'),
      dailyChangePercent: -100,
      nav: 1,
      navDate: '2026-08-10',
    },
    holding: {
      code: '161726',
      dividendMode: 'cash',
      purchaseDate: '2026-08-01',
      totalCostCents: 10000,
      units: 100,
    },
    today: '2026-08-10',
  })

  assert.equal(metrics.currentIncomeSource, 'actual')
  assert.equal(metrics.todayIncome, null)
})
