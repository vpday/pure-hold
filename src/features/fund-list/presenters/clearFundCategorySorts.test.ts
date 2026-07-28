import assert from 'node:assert/strict'
import test from 'node:test'

import { clearFundCategorySorts } from './clearFundCategorySorts.ts'

test('clears only the reported category sorts', () => {
  const sorts = {
    all: { descending: true, sortBy: 'nav' as const },
    custom: { descending: false, sortBy: 'oneYear' as const },
    holdings: { descending: true, sortBy: 'estimatedNav' as const },
  }

  assert.deepEqual(clearFundCategorySorts(sorts, ['all', 'custom']), {
    holdings: sorts.holdings,
  })
  assert.deepEqual(sorts, {
    all: { descending: true, sortBy: 'nav' },
    custom: { descending: false, sortBy: 'oneYear' },
    holdings: { descending: true, sortBy: 'estimatedNav' },
  })
})
