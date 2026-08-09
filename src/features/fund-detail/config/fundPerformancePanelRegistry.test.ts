import assert from 'node:assert/strict'
import test from 'node:test'

import { fundPerformancePanelRegistry } from './fundPerformancePanelRegistry'

test('defines the performance panel order and capabilities', () => {
  const ids = fundPerformancePanelRegistry.map(({ id }) => id)

  assert.deepEqual(ids, [
    'cumulative-returns',
    'cumulative-excess-return',
    'rolling-excess-return',
    'drawdown-comparison',
    'net-value',
    'reinvested-net-value',
    'distribution',
  ])
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(
    fundPerformancePanelRegistry.filter(({ defaultView }) => defaultView).map(({ id }) => id),
    ['cumulative-returns'],
  )

  const distribution = fundPerformancePanelRegistry.find(({ id }) => id === 'distribution')
  assert.ok(distribution)
  assert.equal(distribution.kind, 'distribution')
  assert.equal(distribution.capabilities.range, false)
  assert.equal(distribution.capabilities.referenceIndex, false)
})
