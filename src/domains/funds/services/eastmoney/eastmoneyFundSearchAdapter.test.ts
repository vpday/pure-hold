import assert from 'node:assert/strict'
import test from 'node:test'

import { createEastmoneyFundSearchRequestUrl } from './createEastmoneyFundSearchRequestUrl.ts'
import { parseEastmoneyFundSearchResponse } from './parseEastmoneyFundSearchResponse.ts'

test('creates fixed search parameters and a fresh device id', () => {
  const first = createEastmoneyFundSearchRequestUrl(' 创新药 ', 1)
  const second = createEastmoneyFundSearchRequestUrl('创新药', 2)

  assert.equal(first.pathname, '/search/s/fundinfobynohigh')
  assert.equal(first.searchParams.get('key'), '创新药')
  assert.equal(first.searchParams.get('orderType'), '1')
  assert.equal(first.searchParams.get('pageindex'), '1')
  assert.equal(first.searchParams.get('pagesize'), '20')
  assert.equal(first.searchParams.get('version'), '6.5.5')
  assert.equal(first.searchParams.get('product'), 'EFund')
  assert.equal(first.searchParams.get('plat'), 'Web')
  assert.match(first.searchParams.get('deviceid') ?? '', /^[0-9a-f-]{36}$/i)
  assert.notEqual(first.searchParams.get('deviceid'), second.searchParams.get('deviceid'))
  assert.equal(second.searchParams.get('pageindex'), '2')
})

test('maps valid records, removes duplicates and ignores adapter-only fields', () => {
  const page = parseEastmoneyFundSearchResponse(
    {
      data: [
        {
          fcode: '023930',
          hightlight: '<em>创新药</em>',
          shortname: ' 银华创新药 ',
        },
        { fcode: '023930', shortname: '重复' },
        { fcode: 'bad', shortname: '损坏' },
        { fcode: '000001', shortname: '' },
        { fcode: '000002', shortname: '有效基金' },
      ],
      errorCode: 0,
      success: true,
      totalCount: 557,
    },
    3,
  )

  assert.deepEqual(page, {
    items: [
      { code: '023930', name: '银华创新药' },
      { code: '000002', name: '有效基金' },
    ],
    pageIndex: 3,
    pageSize: 20,
    totalCount: 557,
  })
  assert.equal('hightlight' in page.items[0]!, false)
})

test('rejects unsuccessful and malformed top-level responses', () => {
  for (const value of [
    [],
    { data: [], errorCode: 1, success: false, totalCount: 0 },
    { data: null, errorCode: 0, success: true, totalCount: 0 },
    { data: [], errorCode: 0, success: true, totalCount: -1 },
    { data: [], errorCode: 0, success: true, totalCount: 1.5 },
  ]) {
    assert.throws(() => parseEastmoneyFundSearchResponse(value, 1), /无效数据/)
  }
})
