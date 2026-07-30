import assert from 'node:assert/strict'
import test from 'node:test'

import { toFundNetValueChartModel } from './toFundNetValueChartModel.ts'

const history = {
  fundCode: '161725',
  range: '6y',
  points: [
    {
      cumulativeNetValue: null,
      dailyGrowthPercent: null,
      date: '2026-07-28',
      unitNetValue: 0.5,
    },
    {
      cumulativeNetValue: 2.2784,
      dailyGrowthPercent: 0.9,
      date: '2026-07-29',
      unitNetValue: null,
    },
  ],
} as const

test('maps unit net values without filling null gaps', () => {
  assert.deepEqual(toFundNetValueChartModel(history, 'unit-net-value'), {
    dailyGrowthPercents: [null, 0.9],
    dates: ['2026-07-28', '2026-07-29'],
    name: '单位净值',
    values: [0.5, null],
  })
})

test('maps cumulative net values while preserving aligned growth values', () => {
  assert.deepEqual(toFundNetValueChartModel(history, 'cumulative-net-value'), {
    dailyGrowthPercents: [null, 0.9],
    dates: ['2026-07-28', '2026-07-29'],
    name: '累计净值',
    values: [null, 2.2784],
  })
})
