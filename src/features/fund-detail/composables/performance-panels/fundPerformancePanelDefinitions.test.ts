import assert from 'node:assert/strict'
import test from 'node:test'

import { useFundBenchmarkDataSource } from '../useFundBenchmarkDataSource.ts'
import { useFundHistoryDataSource } from '../useFundHistoryDataSource.ts'
import { createFundPerformancePanelDefinitions } from './createFundPerformancePanelDefinitions.ts'

const expectedIds = [
  'cumulative-returns',
  'cumulative-excess-return',
  'rolling-excess-return',
  'drawdown-comparison',
  'net-value',
  'reinvested-net-value',
  'distribution',
] as const

test('defines every performance panel once in stable order with one default chart', () => {
  const historyDataSource = useFundHistoryDataSource()
  const benchmarkDataSource = useFundBenchmarkDataSource()
  const definitions = createFundPerformancePanelDefinitions({
    benchmarkDataSource,
    historyDataSource,
  })
  const descriptors = definitions.map(({ descriptor }) => descriptor)

  assert.deepEqual(
    descriptors.map(({ id }) => id),
    expectedIds,
  )
  assert.equal(new Set(descriptors.map(({ id }) => id)).size, expectedIds.length)
  assert.deepEqual(
    descriptors.filter(({ defaultView }) => defaultView).map(({ id, kind }) => ({ id, kind })),
    [{ id: 'cumulative-returns', kind: 'chart' }],
  )
  assert.deepEqual(
    definitions.map(({ model }) => model.value.id),
    expectedIds,
  )

  historyDataSource.dispose()
  benchmarkDataSource.dispose()
})
