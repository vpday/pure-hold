import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFundCategories } from './buildFundCategories.ts'

test('derives holdings from records in fund order', () => {
  const categories = buildFundCategories(
    ['161726', '161725'],
    [{ fundCodes: ['161726'], id: 'custom', name: '自定义' }],
    {
      '161725': {
        code: '161725',
        costPrice: 1,
        dividendMode: 'cash',
        purchaseDate: '2020-01-01',
        units: 100,
      },
    },
  )

  assert.deepEqual(categories, [
    { fundCodes: ['161726', '161725'], id: 'all', name: '全部' },
    { fundCodes: ['161725'], id: 'holdings', name: '持仓' },
    { fundCodes: ['161726'], id: 'custom', name: '自定义' },
  ])
})
