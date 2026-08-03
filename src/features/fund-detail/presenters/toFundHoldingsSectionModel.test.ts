import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundHoldingsDisclosure } from '@/domains/funds/models/fundHoldingsDisclosure.ts'
import { toFundHoldingsSectionModel } from './toFundHoldingsSectionModel.ts'

test('formats stock and bond rows, totals and explicit quote signs', () => {
  const model = toFundHoldingsSectionModel({
    activeView: 'positions',
    disclosure: disclosure(),
    holdingsError: '',
    holdingsWarning: '',
    isDatesLoading: false,
    isHoldingsLoading: false,
    isQuotesLoading: false,
    quoteWarning: '',
    quotes: [
      { code: '600519', dailyChangePercent: 1.2, latestPrice: 1400.5, market: 'sh' },
      { code: '118034', dailyChangePercent: -0.26, latestPrice: 118.798, market: 'sh' },
    ],
    reportDates: ['2026-06-30', '2026-03-31'],
    selectedReportDate: '2026-06-30',
  })

  assert.deepEqual(model.stocks[0], {
    changeText: '↑ 0.07%',
    changeTrend: 'up',
    code: '600519',
    dailyChangePercentText: '+1.2%',
    heavyQuarterText: '重仓 21 个季度',
    industryName: '食品饮料',
    name: '贵州茅台',
    netAssetPercentText: '18.33%',
    priceText: '1400.5',
    priceTrend: 'up',
  })
  assert.deepEqual(model.bonds[0], {
    code: '118034',
    dailyChangePercentText: '-0.26%',
    name: '晶能转债',
    netAssetPercentText: '0%',
    priceText: '118.798',
    priceTrend: 'down',
  })
  assert.equal(model.stockTotalLabel, '前 2 只持仓占比合计')
  assert.equal(model.stockTotalText, '18.33%')
  assert.equal(model.bondTotalText, '0%')
  assert.equal(model.reportDateText, '2026-06-30')
})

test('formats decreases, zero, unchanged, missing values and unknown markets', () => {
  const source = disclosure()
  const model = toFundHoldingsSectionModel({
    activeView: 'positions',
    disclosure: {
      ...source,
      bonds: [],
      stocks: [
        { ...source.stocks[0]!, changePercent: -0.38, changeType: 'decreased' },
        {
          ...source.stocks[1]!,
          changePercent: null,
          changeType: 'unchanged',
          market: null,
        },
      ],
    },
    holdingsError: '',
    holdingsWarning: '',
    isDatesLoading: false,
    isHoldingsLoading: false,
    isQuotesLoading: false,
    quoteWarning: '',
    quotes: [{ code: '600519', dailyChangePercent: 0, latestPrice: null, market: 'sh' }],
    reportDates: [],
  })

  assert.equal(model.stocks[0]!.changeText, '↓ -0.38%')
  assert.equal(model.stocks[0]!.changeTrend, 'down')
  assert.equal(model.stocks[0]!.dailyChangePercentText, '+0%')
  assert.equal(model.stocks[0]!.priceText, '--')
  assert.equal(model.stocks[0]!.priceTrend, 'neutral')
  assert.equal(model.stocks[1]!.changeText, '持平')
  assert.equal(model.stocks[1]!.dailyChangePercentText, '--')
  assert.equal(model.stocks[1]!.heavyQuarterText, null)
  assert.equal(model.bondTotalLabel, '前 0 只持仓占比合计')
})

function disclosure(): FundHoldingsDisclosure {
  return {
    bonds: [{ code: '118034', market: 'sh', name: '晶能转债', netAssetPercent: 0 }],
    fundCode: '161725',
    reportDate: '2026-06-30',
    stocks: [
      {
        changePercent: 0.07,
        changeType: 'increased',
        code: '600519',
        heavyQuarterCount: 21,
        industryName: '食品饮料',
        market: 'sh',
        name: '贵州茅台',
        netAssetPercent: 18.33,
      },
      {
        changePercent: null,
        changeType: 'unknown',
        code: '000858',
        heavyQuarterCount: null,
        industryName: null,
        market: 'sz',
        name: '五粮液',
        netAssetPercent: null,
      },
    ],
  }
}
