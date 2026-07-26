import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFundCategories } from './buildFundCategories.ts'

test('keeps holdings empty when all funds only contains manually imported funds', () => {
  const categories = buildFundCategories(
    ['161726', '161725'],
    [{ fundCodes: ['161726'], id: 'custom', name: '自定义' }],
  )

  assert.deepEqual(categories, [
    { fundCodes: ['161726', '161725'], id: 'all', name: '全部' },
    { fundCodes: [], id: 'holdings', name: '持仓' },
    { fundCodes: ['161726'], id: 'custom', name: '自定义' },
  ])
})
