import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundBasicInfo } from '../../../domains/funds/models/fundBasicInfo.ts'
import { createTestFundSnapshot } from '../../../domains/funds/testing/createTestFundSnapshot.ts'
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
    netAssetsText: '197.40亿元',
    oneYearReturnText: '+12.35%',
    oneYearReturnTrend: 'up',
    riskText: 'R4 中高风险',
    shanghaiRating: 3,
    trackingErrorText: '0.0123',
    trackingIndexName: '中证白酒指数',
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

function createBasicInfo(): FundBasicInfo {
  return {
    code: '161725',
    companyName: '招商基金',
    establishedDate: '2015-05-27',
    fundType: '指数型-股票',
    morningstarRating: 5,
    netAssetsYuan: 19740460005.96,
    netAssetsDate: '2026-06-30',
    riskLevel: 4,
    shanghaiRating: 3,
    trackingError: 0.0123,
    trackingIndexName: '中证白酒指数',
  }
}
