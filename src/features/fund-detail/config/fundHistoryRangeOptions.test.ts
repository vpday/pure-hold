import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultFundHistoryRange, fundHistoryRangeOptions } from './fundHistoryRangeOptions.ts'

test('defines all fund history ranges and defaults to the recent six months', () => {
  assert.equal(defaultFundHistoryRange, '6y')
  assert.deepEqual(
    fundHistoryRangeOptions.map(({ label, value }) => [label, value]),
    [
      ['近1月', 'y'],
      ['近3月', '3y'],
      ['近6月', '6y'],
      ['近1年', 'n'],
      ['近3年', '3n'],
      ['近5年', '5n'],
      ['今年来', 'jn'],
      ['成立来', 'ln'],
    ],
  )
})
