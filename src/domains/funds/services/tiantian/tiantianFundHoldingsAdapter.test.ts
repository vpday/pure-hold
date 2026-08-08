import assert from 'node:assert/strict'
import test from 'node:test'

import { createTiantianFundHoldingDatesRequestUrl } from './createTiantianFundHoldingDatesRequestUrl.ts'
import { createTiantianFundHoldingsDisclosureRequestUrl } from './createTiantianFundHoldingsDisclosureRequestUrl.ts'
import { fetchTiantianFundHoldingDates } from './fetchTiantianFundHoldingDates.ts'
import { fetchTiantianFundHoldingsDisclosure } from './fetchTiantianFundHoldingsDisclosure.ts'
import { parseTiantianFundHoldingDatesResponse } from './parseTiantianFundHoldingDatesResponse.ts'
import { parseTiantianFundHoldingsDisclosureResponse } from './parseTiantianFundHoldingsDisclosureResponse.ts'

test('creates holding endpoints with fixed parameters and fresh device ids', () => {
  const firstDates = createTiantianFundHoldingDatesRequestUrl('161725')
  const secondDates = createTiantianFundHoldingDatesRequestUrl('161725')
  const disclosure = createTiantianFundHoldingsDisclosureRequestUrl('161725', '2026-06-30')

  assert.equal(firstDates.pathname, '/mm/FundMNewApi/FundIVInfoMultiple')
  assert.equal(firstDates.searchParams.get('FCODE'), '161725')
  assert.equal(firstDates.searchParams.get('plat'), 'Web')
  assert.equal(firstDates.searchParams.get('product'), 'EFund')
  assert.equal(firstDates.searchParams.get('version'), '6.5.5')
  assert.equal(firstDates.searchParams.get('deviceid'), secondDates.searchParams.get('deviceid'))
  assert.equal(disclosure.pathname, '/mm/FundMNewApi/FundInverstPosition')
  assert.equal(disclosure.searchParams.get('FCODE'), '161725')
  assert.equal(disclosure.searchParams.get('DATE'), '2026-06-30')
  assert.equal(disclosure.searchParams.get('appType'), 'ttjj')
  assert.throws(() => createTiantianFundHoldingDatesRequestUrl('16172'), /exactly 6 digits/)
  assert.throws(
    () => createTiantianFundHoldingsDisclosureRequestUrl('161725', '2026-02-29'),
    /valid YYYY-MM-DD/,
  )
})

test('keeps every valid report date in provider order and removes duplicates', () => {
  assert.deepEqual(
    parseTiantianFundHoldingDatesResponse(
      successful(['2026-06-30', '2021-01-08', '2026-06-30', '2015-05-29']),
    ),
    ['2026-06-30', '2021-01-08', '2015-05-29'],
  )
})

test('rejects invalid report date responses', () => {
  for (const response of [
    successful([]),
    successful(['2026-02-29']),
    successful(['2026-6-30']),
    { data: ['2026-06-30'], errorCode: 1, success: false },
    successful(null),
  ]) {
    assert.throws(
      () => parseTiantianFundHoldingDatesResponse(response),
      /基金持仓报告日期服务返回了无效数据/,
    )
  }
})

test('maps stocks and bonds while filtering hidden and duplicate securities', () => {
  const result = parseTiantianFundHoldingsDisclosureResponse(
    successful(
      {
        fundStocks: [
          stock({
            HOLDCOUNT: '21.0',
            INDEXNAME: ' 食品饮料 ',
            JZBL: '18.33',
            PCTNVCHG: '2.95',
            PCTNVCHGTYPE: '增持',
          }),
          stock({ GPDM: '000001', GPJC: '隐藏股票', ISINVISBL: 0 }),
          stock({ GPDM: '600519', GPJC: '重复股票' }),
          stock({ GPDM: '000858', GPJC: '五粮液', JZBL: 'bad', NEWTEXCH: '9' }),
          stock({ GPDM: 'NVDA', GPJC: '英伟达', ISINVISBL: '--', NEWTEXCH: '105' }),
        ],
        fundboods: [
          { NEWTEXCH: '1', ZJZBL: '0.0', ZQDM: '118034', ZQMC: '晶能转债' },
          { NEWTEXCH: '1', ZJZBL: 1, ZQDM: '118034', ZQMC: '重复债券' },
        ],
      },
      '2026-06-30',
    ),
    '161725',
    '2026-06-30',
  )

  assert.deepEqual(result, {
    bonds: [{ code: '118034', market: 'sh', name: '晶能转债', netAssetPercent: 0 }],
    fundCode: '161725',
    reportDate: '2026-06-30',
    stocks: [
      {
        changePercent: 2.95,
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
        market: null,
        name: '五粮液',
        netAssetPercent: null,
      },
      {
        changePercent: null,
        changeType: 'unknown',
        code: 'NVDA',
        heavyQuarterCount: null,
        industryName: null,
        market: 'us',
        name: '英伟达',
        netAssetPercent: null,
      },
    ],
  })
})

test('allows empty disclosure arrays and rejects malformed roots or dates', () => {
  assert.deepEqual(
    parseTiantianFundHoldingsDisclosureResponse(
      successful({}, '2026-06-30'),
      '161725',
      '2026-06-30',
    ),
    { bonds: [], fundCode: '161725', reportDate: '2026-06-30', stocks: [] },
  )

  for (const response of [
    successful({ fundStocks: {} }, '2026-06-30'),
    successful({}, '2026-03-31'),
    successful([], '2026-06-30'),
    { data: {}, errorCode: 1, expansion: '2026-06-30', success: false },
  ]) {
    assert.throws(() =>
      parseTiantianFundHoldingsDisclosureResponse(response, '161725', '2026-06-30'),
    )
  }
})

test('maps all supported Tiantian security markets', () => {
  const result = parseTiantianFundHoldingsDisclosureResponse(
    successful(
      {
        fundStocks: [
          stock({ GPDM: '000001', GPJC: '深交所', NEWTEXCH: '0' }),
          stock({ GPDM: '600000', GPJC: '上交所', NEWTEXCH: '1' }),
          stock({ GPDM: '00700', GPJC: '港交所', NEWTEXCH: '116' }),
          stock({ GPDM: '00005', GPJC: '港交所扩展码', NEWTEXCH: '128' }),
          stock({ GPDM: 'NVDA', GPJC: '纳斯达克', ISINVISBL: '--', NEWTEXCH: '105' }),
          stock({ GPDM: 'AAPL', GPJC: '纽交所', ISINVISBL: '--', NEWTEXCH: '106' }),
          stock({ GPDM: 'MSFT', GPJC: '美交所', ISINVISBL: '--', NEWTEXCH: '107' }),
        ],
      },
      '2026-06-30',
    ),
    '161725',
    '2026-06-30',
  )

  assert.deepEqual(
    result.stocks.map(({ code, market }) => ({ code, market })),
    [
      { code: '000001', market: 'sz' },
      { code: '600000', market: 'sh' },
      { code: '00700', market: 'hk' },
      { code: '00005', market: 'hk' },
      { code: 'NVDA', market: 'us' },
      { code: 'AAPL', market: 'us' },
      { code: 'MSFT', market: 'us' },
    ],
  )
})

test('loads linked ETF stocks when the fund disclosure has no stocks', async (context) => {
  const originalFetch = globalThis.fetch
  const requested: string[] = []
  const responses = [
    successful(
      {
        ETFCODE: '159792',
        ETFSHORTNAME: '港股通互联网ETF富国',
        fundStocks: null,
        fundboods: [{ NEWTEXCH: '1', ZJZBL: '5.65', ZQDM: '019792', ZQMC: '25国债19' }],
      },
      '2026-06-30',
    ),
    successful(
      {
        fundStocks: [
          stock({
            GPDM: '00700',
            GPJC: '腾讯控股',
            JZBL: '8.5',
            NEWTEXCH: '116',
            PCTNVCHG: '1.2',
            PCTNVCHGTYPE: '增持',
          }),
        ],
      },
      '2026-06-30',
    ),
  ]
  globalThis.fetch = async (input) => {
    requested.push(String(input))
    return {
      ok: true,
      status: 200,
      json: async () => responses.shift(),
    } as Response
  }
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await fetchTiantianFundHoldingsDisclosure('014674', '2026-06-30')

  assert.deepEqual(result, {
    bonds: [{ code: '019792', market: 'sh', name: '25国债19', netAssetPercent: 5.65 }],
    fundCode: '014674',
    reportDate: '2026-06-30',
    stockHoldingsSource: { code: '159792', name: '港股通互联网ETF富国' },
    stocks: [
      {
        changePercent: 1.2,
        changeType: 'increased',
        code: '00700',
        heavyQuarterCount: null,
        industryName: null,
        market: 'hk',
        name: '腾讯控股',
        netAssetPercent: 8.5,
      },
    ],
  })
  assert.equal(requested.length, 2)
  assert.equal(new URL(requested[1]!).searchParams.get('FCODE'), '159792')
})

test('fetches holding dates and disclosure with GET and propagates cancellation', async (context) => {
  const originalFetch = globalThis.fetch
  const requested: string[] = []
  globalThis.fetch = async (input) => {
    requested.push(String(input))
    throw new DOMException('aborted', 'AbortError')
  }
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  const controller = new AbortController()
  await assert.rejects(fetchTiantianFundHoldingDates('161725', controller.signal), {
    name: 'AbortError',
  })
  await assert.rejects(
    fetchTiantianFundHoldingsDisclosure('161725', '2026-06-30', controller.signal),
    { name: 'AbortError' },
  )
  assert.match(requested[0]!, /FundIVInfoMultiple/)
  assert.match(requested[1]!, /FundInverstPosition/)
})

function successful(data: unknown, expansion?: string): unknown {
  return { data, errorCode: 0, expansion, success: true }
}

function stock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    GPDM: '600519',
    GPJC: '贵州茅台',
    ISINVISBL: '0',
    NEWTEXCH: '1',
    ...overrides,
  }
}
