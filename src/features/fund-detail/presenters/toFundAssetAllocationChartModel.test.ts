import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundAssetAllocation } from '@/domains/funds/models/fundAssetAllocation.ts'
import { toFundAssetAllocationChartModel } from './toFundAssetAllocationChartModel.ts'

test('maps aligned allocation series without mutating domain points', () => {
  const allocation: FundAssetAllocation = {
    fundCode: '161725',
    points: [
      {
        bondPercent: 2,
        cashPercent: 3,
        date: '2025-12-31',
        netAssetValue: 400,
        stockPercent: 95,
      },
      {
        bondPercent: null,
        cashPercent: 5,
        date: '2026-06-30',
        netAssetValue: 402.2078,
        stockPercent: 94.62,
      },
    ],
  }

  const model = toFundAssetAllocationChartModel(allocation)
  assert.deepEqual(model, {
    dates: ['2025-12-31', '2026-06-30'],
    series: [
      { name: '股票占净值比', values: [95, 94.62] },
      { name: '债券占净值比', values: [2, null] },
      { name: '现金占净值比', values: [3, 5] },
      { name: '资产净值', values: [400, 402.2078] },
    ],
  })
  assert.notEqual(model.dates, allocation.points)
})
