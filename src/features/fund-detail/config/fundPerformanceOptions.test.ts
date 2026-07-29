import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildFundReferenceIndexOptions,
  defaultFundPerformanceRange,
  fundPerformanceRangeOptions,
} from './fundPerformanceOptions.ts'

test('puts a valid tracking index first and keeps its name while deduplicating', () => {
  assert.deepEqual(buildFundReferenceIndexOptions(' 000001 ', ' 基金自身指数 '), [
    { code: '000001', name: '基金自身指数' },
    { code: '399001', name: '深证指数' },
    { code: '399006', name: '创业板指' },
    { code: '000300', name: '沪深300' },
    { code: '399005', name: '中小板指' },
    { code: '000905', name: '中证500' },
    { code: '000016', name: '上证50' },
  ])
})

test('uses the fixed index order when the tracking index pair is invalid', () => {
  const expectedCodes = ['000001', '399001', '399006', '000300', '399005', '000905', '000016']
  assert.deepEqual(
    buildFundReferenceIndexOptions(null, null).map(({ code }) => code),
    expectedCodes,
  )
  assert.deepEqual(
    buildFundReferenceIndexOptions('399997', ' ').map(({ code }) => code),
    expectedCodes,
  )
})

test('defines all performance ranges and defaults to the recent month', () => {
  assert.equal(defaultFundPerformanceRange, 'y')
  assert.deepEqual(
    fundPerformanceRangeOptions.map(({ label, value }) => [label, value]),
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
