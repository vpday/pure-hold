import assert from 'node:assert/strict'
import test from 'node:test'

import { createTestFundSnapshot } from '../testing/createTestFundSnapshot.ts'
import { mergeFundRefreshResult } from './mergeFundRefreshResult.ts'

test('refresh merge only replaces valid current requested funds and preserves stale data', () => {
  const oldA = createTestFundSnapshot('161726')
  const oldB = createTestFundSnapshot('161725')
  const freshA = { ...oldA, estimatedNav: 1.23, fetchedAt: 100 }
  const unexpected = { ...oldA, code: 'unexpected' }
  const result = mergeFundRefreshResult(
    { '161725': oldB, '161726': oldA },
    ['161726', '161725'],
    ['161726', '161725'],
    {
      fetchedAt: 100,
      issues: [{ code: 'missing-record', fundCode: '161725' }],
      snapshots: [freshA, unexpected],
    },
  )
  assert.equal(result.updatedCount, 1)
  assert.equal(result.snapshotsByCode['161726'], freshA)
  assert.equal(result.snapshotsByCode['161725'], oldB)
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['missing-record', 'unexpected-record'],
  )
})

test('refresh merge ignores a fund deleted while the request was active', () => {
  const snapshot = createTestFundSnapshot('161726')
  const result = mergeFundRefreshResult({}, [], ['161726'], {
    fetchedAt: 100,
    issues: [],
    snapshots: [snapshot],
  })
  assert.equal(result.updatedCount, 0)
  assert.deepEqual(result.snapshotsByCode, {})
})
