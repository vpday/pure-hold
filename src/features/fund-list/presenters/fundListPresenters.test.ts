import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundSnapshot } from '../../../domains/funds/models/fundSnapshot.ts'
import { createTestFundSnapshot } from '../../../domains/funds/testing/createTestFundSnapshot.ts'
import { sortFundSnapshots } from './sortFundSnapshots.ts'
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

test('fund sorting is stable, keeps missing values last and null restores default order', () => {
  const base = createTestFundSnapshot('161726')
  const snapshots = [
    { ...base, code: 'a', estimatedNav: 2 },
    { ...base, code: 'b', estimatedNav: null },
    { ...base, code: 'c', estimatedNav: 1 },
    { ...base, code: 'd', estimatedNav: 2 },
  ]
  assert.deepEqual(
    sortFundSnapshots(snapshots, { descending: false, sortBy: 'estimatedNav' }).map(
      (item) => item.code,
    ),
    ['c', 'a', 'd', 'b'],
  )
  assert.deepEqual(
    sortFundSnapshots(snapshots, { descending: true, sortBy: 'estimatedNav' }).map(
      (item) => item.code,
    ),
    ['a', 'd', 'c', 'b'],
  )
  assert.deepEqual(
    sortFundSnapshots(snapshots, null).map((item) => item.code),
    ['a', 'b', 'c', 'd'],
  )
})
