import assert from 'node:assert/strict'
import test from 'node:test'

import { toFundReinvestedNavChartModel } from './toFundReinvestedNavChartModel.ts'

test('maps absolute values and groups applied events by date', () => {
  assert.deepEqual(
    toFundReinvestedNavChartModel({
      appliedEvents: [
        { date: '2026-07-28', type: 'dividend' },
        { date: '2026-07-28', type: 'conversion' },
        { date: '2026-07-27', type: 'dividend' },
      ],
      points: [
        { date: '2026-07-28', reinvestedNetValue: 2.25, unitNetValue: 1.25 },
        { date: '2026-07-29', reinvestedNetValue: 2.5, unitNetValue: 1.3 },
      ],
    }),
    {
      dates: ['2026-07-28', '2026-07-29'],
      events: [
        {
          date: '2026-07-28',
          types: ['dividend', 'conversion'],
          unitNetValue: 1.25,
        },
      ],
      series: [
        { name: '单位净值', values: [1.25, 1.3] },
        { name: '复权净值', values: [2.25, 2.5] },
      ],
    },
  )
})
