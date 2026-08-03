import assert from 'node:assert/strict'
import test from 'node:test'

import { toFundNetValueChartModel } from './toFundNetValueChartModel.ts'

const history = {
  events: [
    { date: '2026-07-28', type: 'dividend' },
    { date: '2026-07-28', type: 'manager-change' },
    { date: '2026-07-29', type: 'dividend' },
  ],
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

test('maps both net value series and preserves null gaps', () => {
  assert.deepEqual(toFundNetValueChartModel(history), {
    dailyGrowthPercents: [null, 0.9],
    dates: ['2026-07-28', '2026-07-29'],
    events: [
      {
        date: '2026-07-28',
        types: ['dividend', 'manager-change'],
        unitNetValue: 0.5,
      },
    ],
    series: [
      { name: '单位净值', values: [0.5, null] },
      { name: '累计净值', values: [null, 2.2784] },
    ],
  })
})
