import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot.ts'
import type { FundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics.ts'
import { createTestFundSnapshot } from '@/domains/funds/testing/createTestFundSnapshot.ts'
import type { FundRowViewModel, FundSortField } from '../models/fundListViewModel.ts'
import {
  createFundRowComparator,
  moveMissingFundRowsLast,
  sortFundRows,
} from './sortFundSnapshots.ts'
import { toFundListViewModel } from './toFundListViewModel.ts'

const sortFields = [
  'dailyChangePercent',
  'estimatedChangePercent',
  'estimatedIncome',
  'estimatedNav',
  'fiveYears',
  'holdingAmount',
  'holdingDays',
  'holdingIncomePercent',
  'nav',
  'oneMonth',
  'oneWeek',
  'oneYear',
  'sinceInception',
  'sixMonths',
  'threeMonths',
  'threeYears',
  'todayIncome',
  'twoYears',
  'yearToDate',
  'yesterdayIncome',
] as const satisfies readonly FundSortField[]

test('fund presenter keeps signs, missing placeholders, all return fields and trends', () => {
  const source: FundSnapshot = {
    ...createTestFundSnapshot('161726'),
    dailyChangePercent: -1,
    estimatedChangePercent: 2,
    estimatedNav: 1.23456,
    nav: 1.1,
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
  assert.deepEqual(row.sortValues, {
    dailyChangePercent: -1,
    estimatedChangePercent: 2,
    estimatedIncome: null,
    estimatedNav: 1.23456,
    fiveYears: null,
    holdingAmount: null,
    holdingDays: null,
    holdingIncomePercent: null,
    nav: 1.1,
    oneMonth: 0,
    oneWeek: 1,
    oneYear: null,
    sinceInception: -3,
    sixMonths: null,
    threeMonths: null,
    threeYears: null,
    todayIncome: null,
    twoYears: null,
    yearToDate: null,
    yesterdayIncome: null,
  })
})

test('fund presenter formats holding income and keeps raw amount sort values', () => {
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
  assert.equal(row.holding?.sortValues.todayIncome, 25)
  assert.equal(row.holding?.sortValues.estimatedIncome, null)
  assert.equal(row.sortValues.holdingAmount, 1234.5)
  assert.equal(row.sortValues.holdingDays, 9)
  assert.equal(row.sortValues.holdingIncomePercent, -1.25)
  assert.equal(row.sortValues.todayIncome, 25)
  assert.equal(row.sortValues.yesterdayIncome, 0)
  assert.equal(row.sortValues.estimatedIncome, null)
})

test('fund row sorting covers every field, stays stable and keeps missing values last', () => {
  for (const field of sortFields) {
    const rows = [
      rowWithSortValue('a', field, 2),
      rowWithSortValue('b', field, null),
      rowWithSortValue('c', field, 1),
      rowWithSortValue('d', field, 2),
    ]

    assert.deepEqual(
      sortFundRows(rows, { descending: false, sortBy: field }).map((row) => row.code),
      ['c', 'a', 'd', 'b'],
      `${field} ascending`,
    )
    assert.deepEqual(
      sortFundRows(rows, { descending: true, sortBy: field }).map((row) => row.code),
      ['a', 'd', 'c', 'b'],
      `${field} descending`,
    )
  }
})

test('desktop adapter restores null-last after TDesign reverses comparator arguments', () => {
  const field = 'estimatedChangePercent'
  const rows = [
    rowWithSortValue('a', field, 2),
    rowWithSortValue('b', field, null),
    rowWithSortValue('c', field, 1),
    rowWithSortValue('d', field, 2),
  ]
  const compare = createFundRowComparator(field)
  const tdesignDescendingRows = [...rows].sort((left, right) => compare(right, left))

  assert.deepEqual(
    moveMissingFundRowsLast(tdesignDescendingRows, field).map((row) => row.code),
    ['a', 'd', 'c', 'b'],
  )
})

test('null sort restores the input order', () => {
  const rows = [
    rowWithSortValue('a', 'dailyChangePercent', 2),
    rowWithSortValue('b', 'dailyChangePercent', 1),
  ]
  assert.deepEqual(
    sortFundRows(rows, null).map((row) => row.code),
    ['a', 'b'],
  )
})

function rowWithSortValue(
  code: string,
  field: FundSortField,
  value: number | null,
): FundRowViewModel {
  const row = toFundListViewModel(createTestFundSnapshot(code))
  return { ...row, sortValues: { ...row.sortValues, [field]: value } }
}
