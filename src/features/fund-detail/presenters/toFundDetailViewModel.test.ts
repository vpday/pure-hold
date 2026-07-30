import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo.ts'
import { createTestFundSnapshot } from '@/domains/funds/testing/createTestFundSnapshot.ts'
import { toFundDetailViewModel } from './toFundDetailViewModel.ts'

test('formats snapshot quotes and complete basic information', () => {
  const snapshot = {
    ...createTestFundSnapshot('161725', '招商中证白酒指数(LOF)A'),
    dailyChangePercent: -1.2,
    nav: 1.23456,
    navDate: '2026-07-28',
    returns: {
      ...createTestFundSnapshot('161725').returns,
      oneYear: 12.345,
    },
  }
  const viewModel = toFundDetailViewModel(snapshot, createBasicInfo())

  assert.deepEqual(viewModel, {
    code: '161725',
    companyName: '招商基金',
    dailyChangePercentText: '-1.20%',
    dailyChangeTrend: 'down',
    establishedDateText: '2015-05-27',
    fundType: '指数型-股票',
    morningstarRating: 5,
    name: '招商中证白酒指数(LOF)A',
    navDateText: '07-28',
    navText: '1.2346',
    netAssetsDateText: '06-30',
    netAssetsText: '197.40 亿元',
    oneYearReturnText: '+12.35%',
    oneYearReturnTrend: 'up',
    riskText: 'R4 中高风险',
    shanghaiRating: 3,
    trackingErrorText: '0.0123',
    trackingIndexName: '中证白酒指数',
    tradingRules: {
      custodyFeeText: '0.2%（每年）',
      dailyPurchaseLimitText: '50万元',
      managementFeeText: '1%（每年）',
      minimumPurchaseAmountText: '10元',
      purchaseConfirmationText: 'T+1',
      purchaseDiscountText: '1折',
      purchaseFeeText: '0.1%',
      purchaseStatusText: '限大额',
      purchaseStatusTone: 'warning',
      redemptionConfirmationText: 'T+1',
      redemptionFundsArrivalText: 'T+3',
      redemptionStatusText: '开放赎回',
      redemptionStatusTone: 'success',
      salesServiceFeeText: '0%（每年）',
      standardPurchaseFeeText: '1%',
    },
  })
})

test('maps all risk levels and preserves numeric ratings', () => {
  const snapshot = createTestFundSnapshot('161725')
  const expectedRisks = ['R1 低风险', 'R2 中低风险', 'R3 中风险', 'R4 中高风险', 'R5 高风险']

  for (let level = 1; level <= 5; level += 1) {
    const result = toFundDetailViewModel(snapshot, {
      ...createBasicInfo(),
      morningstarRating: level,
      riskLevel: level,
      shanghaiRating: level,
    })
    assert.equal(result.riskText, expectedRisks[level - 1])
    assert.equal(result.morningstarRating, level)
    assert.equal(result.shanghaiRating, level)
  }

  const missing = toFundDetailViewModel(snapshot)
  assert.equal(missing.riskText, '风险等级未知')
  assert.equal(missing.morningstarRating, null)
  assert.equal(missing.shanghaiRating, null)
})

test('uses placeholders and preserves unrecognized full dates', () => {
  const viewModel = toFundDetailViewModel(createTestFundSnapshot('161725'), {
    ...createBasicInfo(),
    establishedDate: '2015年5月27日',
    netAssetsDate: 'unknown',
    trackingError: null,
  })

  assert.equal(viewModel.establishedDateText, '2015年5月27日')
  assert.equal(viewModel.netAssetsDateText, '--')
  assert.equal(viewModel.navDateText, '--')
  assert.equal(viewModel.navText, '--')
  assert.equal(viewModel.trackingErrorText, '--')
})

test('formats trading-rule amount units and precision', () => {
  const snapshot = createTestFundSnapshot('161725')
  const amounts = [
    [0, '0元'],
    [9999, '9999元'],
    [10000, '1万元'],
    [12345, '1.23万元'],
    [99999999, '10000万元'],
    [100000000, '1亿元'],
    [123456789, '1.23亿元'],
  ] as const

  for (const [amount, expected] of amounts) {
    const rules = toFundDetailViewModel(snapshot, {
      ...createBasicInfo(),
      minimumPurchaseAmountYuan: amount,
    }).tradingRules
    assert.ok(rules)
    assert.equal(rules.minimumPurchaseAmountText, expected)
  }
})

test('shows discounts only for a lower valid purchase fee', () => {
  const snapshot = createTestFundSnapshot('161725')
  const discounted = toFundDetailViewModel(snapshot, {
    ...createBasicInfo(),
    purchaseFeePercent: 0.125,
    standardPurchaseFeePercent: 1,
  }).tradingRules
  assert.ok(discounted)
  assert.equal(discounted.purchaseFeeText, '0.13%')
  assert.equal(discounted.standardPurchaseFeeText, '1%')
  assert.equal(discounted.purchaseDiscountText, '1.25折')

  for (const [purchaseFeePercent, standardPurchaseFeePercent] of [
    [1, 1],
    [1, 0],
    [1, null],
    [null, 1],
  ] as const) {
    const rules = toFundDetailViewModel(snapshot, {
      ...createBasicInfo(),
      purchaseFeePercent,
      standardPurchaseFeePercent,
    }).tradingRules
    assert.ok(rules)
    assert.equal(rules.purchaseFeeText, purchaseFeePercent === null ? '--' : '1%')
    assert.equal(rules.standardPurchaseFeeText, null)
    assert.equal(rules.purchaseDiscountText, null)
  }
})

test('maps exact trading statuses to semantic tones', () => {
  const snapshot = createTestFundSnapshot('161725')
  const statuses = [
    ['开放申购', 'success'],
    ['开放赎回', 'success'],
    ['限大额', 'warning'],
    ['限制申购', 'warning'],
    ['暂停申购', 'error'],
    ['暂停赎回', 'error'],
    ['封闭期', 'error'],
    ['未知状态', 'neutral'],
  ] as const

  for (const [status, tone] of statuses) {
    const rules = toFundDetailViewModel(snapshot, {
      ...createBasicInfo(),
      purchaseStatus: status,
    }).tradingRules
    assert.ok(rules)
    assert.equal(rules.purchaseStatusText, status)
    assert.equal(rules.purchaseStatusTone, tone)
  }
})

test('keeps a complete placeholder model after a successful empty response', () => {
  const rules = toFundDetailViewModel(createTestFundSnapshot('161725'), {
    ...createBasicInfo(),
    custodyFeePercent: null,
    dailyPurchaseLimitYuan: null,
    managementFeePercent: null,
    minimumPurchaseAmountYuan: null,
    purchaseConfirmationDays: null,
    purchaseFeePercent: null,
    purchaseStatus: null,
    redemptionConfirmationDays: null,
    redemptionFundsArrivalDays: null,
    redemptionStatus: null,
    salesServiceFeePercent: null,
    standardPurchaseFeePercent: null,
  }).tradingRules

  assert.deepEqual(rules, {
    custodyFeeText: '--',
    dailyPurchaseLimitText: '--',
    managementFeeText: '--',
    minimumPurchaseAmountText: '--',
    purchaseConfirmationText: '--',
    purchaseDiscountText: null,
    purchaseFeeText: '--',
    purchaseStatusText: '--',
    purchaseStatusTone: 'neutral',
    redemptionConfirmationText: '--',
    redemptionFundsArrivalText: '--',
    redemptionStatusText: '--',
    redemptionStatusTone: 'neutral',
    salesServiceFeeText: '--',
    standardPurchaseFeeText: null,
  })
})

test('formats zero confirmation days and hides rules without basic information', () => {
  const snapshot = createTestFundSnapshot('161725')
  const rules = toFundDetailViewModel(snapshot, {
    ...createBasicInfo(),
    purchaseConfirmationDays: 0,
    redemptionConfirmationDays: 0,
    redemptionFundsArrivalDays: 0,
  }).tradingRules

  assert.ok(rules)
  assert.equal(rules.purchaseConfirmationText, 'T+0')
  assert.equal(rules.redemptionConfirmationText, 'T+0')
  assert.equal(rules.redemptionFundsArrivalText, 'T+0')
  assert.equal(toFundDetailViewModel(snapshot).tradingRules, null)
})

function createBasicInfo(): FundBasicInfo {
  return {
    code: '161725',
    companyName: '招商基金',
    custodyFeePercent: 0.2,
    dailyPurchaseLimitYuan: 500000,
    establishedDate: '2015-05-27',
    fundType: '指数型-股票',
    managementFeePercent: 1,
    minimumPurchaseAmountYuan: 10,
    morningstarRating: 5,
    netAssetsYuan: 19740460005.96,
    netAssetsDate: '2026-06-30',
    purchaseConfirmationDays: 1,
    purchaseFeePercent: 0.1,
    purchaseStatus: '限大额',
    redemptionConfirmationDays: 1,
    redemptionFundsArrivalDays: 3,
    redemptionStatus: '开放赎回',
    riskLevel: 4,
    salesServiceFeePercent: 0,
    shanghaiRating: 3,
    standardPurchaseFeePercent: 1,
    trackingError: 0.0123,
    trackingIndexCode: '399997',
    trackingIndexName: '中证白酒指数',
  }
}
