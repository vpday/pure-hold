import assert from 'node:assert/strict'
import test from 'node:test'

import {
  fundTagTheme,
  isEstimatedQuoteEmpty,
  isIncomeEmpty,
  shouldShowIncomeDate,
} from './fundDisplayRules.ts'

test('maps fund tags to the shared semantic themes', () => {
  assert.equal(fundTagTheme('近一年新低'), 'success')
  assert.equal(fundTagTheme('连续3日连跌'), 'success')
  assert.equal(fundTagTheme('日限额1000元'), 'danger')
  assert.equal(fundTagTheme('近一年新高'), 'danger')
  assert.equal(fundTagTheme('连续3日连涨'), 'danger')
  assert.equal(fundTagTheme('普通标签'), undefined)
})

test('treats an estimated quote as empty only when every displayed field is missing', () => {
  assert.equal(
    isEstimatedQuoteEmpty({
      estimatedAtText: '--',
      estimatedChangePercentText: '--',
      estimatedNavText: '--',
    }),
    true,
  )
  assert.equal(
    isEstimatedQuoteEmpty({
      estimatedAtText: '--',
      estimatedChangePercentText: '+1.00%',
      estimatedNavText: '--',
    }),
    false,
  )
})

test('treats an income as empty only when both displayed values are missing', () => {
  assert.equal(isIncomeEmpty({ amountText: '--', percentText: '--' }), true)
  assert.equal(isIncomeEmpty({ amountText: '+1.00', percentText: '--' }), false)
})

test('hides the income date when both income values are missing', () => {
  assert.equal(
    shouldShowIncomeDate({ amountText: '--', percentText: '--' }, '2026-08-07', '08-10'),
    false,
  )
  assert.equal(
    shouldShowIncomeDate({ amountText: '+1.00', percentText: '--' }, '2026-08-07', '08-10'),
    true,
  )
  assert.equal(shouldShowIncomeDate({ amountText: '+1.00', percentText: '--' }, '2026-08-07'), true)
})
