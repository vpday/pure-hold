import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot.ts'
import type { FundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics.ts'
import { createTestFundSnapshot } from '@/domains/funds/testing/createTestFundSnapshot.ts'
import { sortFundRows, sortFundSnapshots } from './sortFundSnapshots.ts'
import { toFundListViewModel } from './toFundListViewModel.ts'

test('fund presenter keeps signs, missing placeholders, all return fields and trends', () => {
  const source: FundSnapshot = {
    ...createTestFundSnapshot('161726'),
    dailyChangePercent: -1,
    estimatedChangePercent: 2,
    estimatedNav: 1.23456,
    returns: {
      fiveYears: null,
      oneMonth: 0,
      oneWeek: 1,
      oneYear: null,
      sinceInception: -3,
      sixMonths: null,
      threeMonths: null,
      threeYears: null,
      twoYears: null,
      yearToDate: null,
    },
  }
  const row = toFundListViewModel(source)
  assert.equal(row.estimatedNavText, '1.2346')
  assert.equal(row.estimatedChangePercentText, '+2.00%')
  assert.equal(row.dailyChangePercentText, '-1.00%')
  assert.equal(row.returns.oneMonth, '0.00%')
  assert.equal(row.returns.fiveYears, '--')
  assert.equal(row.returns.sinceInception, '-3.00%')
  assert.equal(Object.keys(row.returns).length, 10)
  assert.equal(row.trendByField.estimatedChangePercent, 'up')
  assert.equal(row.trendByField.dailyChangePercent, 'down')
})

test('fund presenter formats holding income without losing raw percentage sort values', () => {
  const metrics: FundHoldingMetrics = {
    confirmedNavDate: '2026-08-10',
    currentIncomeSource: 'actual',
    estimatedIncome: null,
    estimatedIncomePercent: null,
    holdingAmount: 1234.5,
    holdingDays: 9,
    holdingIncome: -12.5,
    holdingIncomePercent: -1.25,
    todayIncome: 25,
    todayIncomePercent: 2.5,
    yesterdayIncome: 0,
    yesterdayIncomeDate: '2026-08-07',
    yesterdayIncomePercent: 0,
  }

  const row = toFundListViewModel(createTestFundSnapshot('161726'), metrics)

  assert.equal(row.holding?.currentIncome.label, '今日收益')
  assert.equal(row.holding?.currentIncome.amountText, '+25.00')
  assert.equal(row.holding?.todayIncome.percentText, '+2.50%')
  assert.equal(row.holding?.holdingIncome.amountText, '-12.50')
  assert.equal(row.holding?.holdingIncome.trend, 'down')
  assert.equal(row.holding?.yesterdayIncome.amountText, '0.00')
  assert.equal(row.holding?.holdingAmountText, '1234.50')
  assert.equal(row.holding?.holdingDaysText, '9 天')
  assert.equal(row.holding?.sortValues.holdingAmount, 1234.5)
  assert.equal(row.holding?.sortValues.holdingDays, 9)
  assert.equal(row.holding?.sortValues.todayIncomePercent, 2.5)
  assert.equal(row.holding?.sortValues.estimatedIncomePercent, null)
})

test('fund sorting is stable, keeps missing values last and null restores default order', () => {
  const base = createTestFundSnapshot('161726')
  const snapshots = [
    { ...base, code: 'a', dailyChangePercent: 1, estimatedChangePercent: 2 },
    { ...base, code: 'b', dailyChangePercent: 3, estimatedChangePercent: null },
    { ...base, code: 'c', dailyChangePercent: null, estimatedChangePercent: 1 },
    { ...base, code: 'd', dailyChangePercent: 2, estimatedChangePercent: 2 },
  ]
  assert.deepEqual(
    sortFundSnapshots(snapshots, { descending: false, sortBy: 'estimatedChangePercent' }).map(
      (item) => item.code,
    ),
    ['c', 'a', 'd', 'b'],
  )
  assert.deepEqual(
    sortFundSnapshots(snapshots, { descending: true, sortBy: 'estimatedChangePercent' }).map(
      (item) => item.code,
    ),
    ['a', 'd', 'c', 'b'],
  )
  assert.deepEqual(
    sortFundSnapshots(snapshots, { descending: false, sortBy: 'dailyChangePercent' }).map(
      (item) => item.code,
    ),
    ['a', 'd', 'b', 'c'],
  )
  assert.deepEqual(
    sortFundSnapshots(snapshots, null).map((item) => item.code),
    ['a', 'b', 'c', 'd'],
  )
})

test('holding row sorting uses raw percentages and stably keeps missing values last', () => {
  const rows = [
    toFundListViewModel(createTestFundSnapshot('a'), holdingMetrics(2)),
    toFundListViewModel(createTestFundSnapshot('b'), holdingMetrics(null)),
    toFundListViewModel(createTestFundSnapshot('c'), holdingMetrics(1)),
    toFundListViewModel(createTestFundSnapshot('d'), holdingMetrics(2)),
  ]

  assert.deepEqual(
    sortFundRows(rows, { descending: false, sortBy: 'holdingIncomePercent' }).map(
      (row) => row.code,
    ),
    ['c', 'a', 'd', 'b'],
  )
  assert.deepEqual(
    sortFundRows(rows, { descending: true, sortBy: 'holdingIncomePercent' }).map((row) => row.code),
    ['a', 'd', 'c', 'b'],
  )
})

test('holding row sorting supports amount and days', () => {
  const rows = [
    toFundListViewModel(createTestFundSnapshot('a'), holdingMetrics(null, 200, 5)),
    toFundListViewModel(createTestFundSnapshot('b'), holdingMetrics(null, null, 7)),
    toFundListViewModel(createTestFundSnapshot('c'), holdingMetrics(null, 100, 2)),
    toFundListViewModel(createTestFundSnapshot('d'), holdingMetrics(null, 200, 1)),
  ]

  assert.deepEqual(
    sortFundRows(rows, { descending: false, sortBy: 'holdingAmount' }).map((row) => row.code),
    ['c', 'a', 'd', 'b'],
  )
  assert.deepEqual(
    sortFundRows(rows, { descending: true, sortBy: 'holdingDays' }).map((row) => row.code),
    ['b', 'a', 'c', 'd'],
  )
})

function holdingMetrics(
  holdingIncomePercent: number | null,
  holdingAmount: number | null = null,
  holdingDays: number | null = null,
): FundHoldingMetrics {
  return {
    confirmedNavDate: null,
    currentIncomeSource: 'none',
    estimatedIncome: null,
    estimatedIncomePercent: null,
    holdingAmount,
    holdingDays,
    holdingIncome: holdingIncomePercent,
    holdingIncomePercent,
    todayIncome: null,
    todayIncomePercent: null,
    yesterdayIncome: null,
    yesterdayIncomeDate: null,
    yesterdayIncomePercent: null,
  }
}
