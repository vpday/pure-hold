import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundHoldingStatistics } from '@/domains/funds/models/fundHoldingStatistics.ts'
import { toFundHoldingStatisticsViewModel } from './toFundHoldingStatisticsViewModel.ts'

test('formats holding statistics with signs, currency and rates', () => {
  const statistics: FundHoldingStatistics = {
    currentIncome: 25,
    currentIncomePercent: 2.5,
    currentIncomeSource: 'actual',
    holdingAmount: 1234.5,
    holdingIncome: -12.5,
    holdingIncomePercent: -1.25,
    yesterdayIncome: 0,
    yesterdayIncomePercent: 0,
  }

  const viewModel = toFundHoldingStatisticsViewModel({ fundCount: 2, statistics })

  assert.equal(viewModel.fundCount, 2)
  assert.equal(viewModel.holdingAmount.amountText, '¥1,234.50')
  assert.equal(viewModel.currentIncome.amountText, '+¥25.00')
  assert.equal(viewModel.currentIncome.rateText, '+2.50%')
  assert.equal(viewModel.currentIncomeLabel, '当日收益')
  assert.equal(viewModel.yesterdayIncome.amountText, '¥0.00')
  assert.equal(viewModel.holdingIncome.amountText, '-¥12.50')
  assert.equal(viewModel.holdingIncome.rateText, '-1.25%')
  assert.equal(viewModel.holdingIncome.trend, 'down')
})

test('labels mixed current income sources and keeps missing values visible', () => {
  const statistics: FundHoldingStatistics = {
    currentIncome: null,
    currentIncomePercent: null,
    currentIncomeSource: 'mixed',
    holdingAmount: null,
    holdingIncome: null,
    holdingIncomePercent: null,
    yesterdayIncome: null,
    yesterdayIncomePercent: null,
  }

  const viewModel = toFundHoldingStatisticsViewModel({ fundCount: 1, statistics })

  assert.equal(viewModel.currentIncomeLabel, '当日/估算收益')
  assert.equal(viewModel.currentIncome.amountText, '--')
  assert.equal(viewModel.currentIncome.rateText, '--')
  assert.equal(viewModel.currentIncome.trend, 'unknown')
  assert.equal(viewModel.holdingAmount.amountText, '--')
})
