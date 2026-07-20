import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexDefinition } from '../../../domains/indices/models/indexDefinition.ts'
import type { IndexGroupDefinition } from '../../../domains/indices/models/indexGroupDefinition.ts'
import type { IndexQuoteSnapshot } from '../../../domains/indices/models/indexQuote.ts'
import { toIndexOverviewViewModel } from './toIndexOverviewViewModel.ts'

const definitions: readonly IndexDefinition[] = [
  { id: 'cn', market: 'cn', name: '内地', quoteCode: '1.000001', securityCode: '000001' },
  { id: 'hk', market: 'hk', name: '香港', quoteCode: '124.HSTECH', securityCode: 'HSTECH' },
]
const groups: readonly IndexGroupDefinition[] = [
  { id: 'primary', name: '主要指数', quoteCodes: ['124.HSTECH', '1.000001'] },
  { id: 'watching', name: '关注', quoteCodes: ['124.HSTECH', '100.MISSING'] },
]
const hkQuote: IndexQuoteSnapshot = {
  changeAmount: 12.3,
  changePercent: 1.25,
  indexId: 'hk',
  price: 4987.36,
  quotedAt: Date.UTC(2026, 6, 20, 7, 24, 19),
}

test('builds ordered groups and reuses quotes across group references', () => {
  const viewModel = toIndexOverviewViewModel({
    definitions,
    groups,
    health: 'healthy',
    quotesByIndexId: { hk: hkQuote },
  })

  assert.deepEqual(
    viewModel.groups.map((group) => ({
      id: group.id,
      itemIds: group.items.map((item) => item.id),
    })),
    [
      { id: 'primary', itemIds: ['hk', 'cn'] },
      { id: 'watching', itemIds: ['hk'] },
    ],
  )
  assert.deepEqual(viewModel.groups[0]?.items[0], {
    changeAmountText: '+12.30',
    changePercentText: '+1.25%',
    code: 'HSTECH',
    id: 'hk',
    name: '香港',
    priceText: '4987.36',
    trend: 'up',
  })
  assert.equal(viewModel.groups[0]?.items[1]?.priceText, '--')
  assert.equal(viewModel.groups[0]?.items[1]?.trend, 'unknown')
  assert.deepEqual(viewModel.groups[1]?.items[0], viewModel.groups[0]?.items[0])
})

test('keeps explicit signs and trend semantics', () => {
  const viewModel = toIndexOverviewViewModel({
    definitions,
    groups: [{ id: 'test', name: '测试', quoteCodes: ['1.000001'] }],
    health: 'healthy',
    quotesByIndexId: {
      cn: {
        changeAmount: -3.5,
        changePercent: -0.5,
        indexId: 'cn',
        price: 3000,
        quotedAt: hkQuote.quotedAt,
      },
    },
  })

  assert.equal(viewModel.groups[0]?.items[0]?.changeAmountText, '-3.50')
  assert.equal(viewModel.groups[0]?.items[0]?.changePercentText, '-0.50%')
  assert.equal(viewModel.groups[0]?.items[0]?.trend, 'down')
})
