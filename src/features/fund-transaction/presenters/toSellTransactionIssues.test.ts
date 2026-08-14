import assert from 'node:assert/strict'
import { test } from 'node:test'

import { toSellTransactionIssueViewModels } from './toSellTransactionViewModel.ts'

test('presents an insufficient-units issue with requested and available shares', () => {
  const viewModels = toSellTransactionIssueViewModels(
    {
      issues: [
        {
          availableUnits: { confidence: 'estimated', source: 'formula', value: 80 },
          code: 'insufficient-units',
          eventId: 'sell-too-much',
          fundCode: '161725',
          requestedUnits: { confidence: 'actual', source: 'manual', value: 120 },
        },
      ],
    } as never,
    '161725',
  )

  assert.deepEqual(viewModels, [
    {
      eventId: 'sell-too-much',
      text: '份额不足：请求 120.0000 份，可用 80.0000 份。',
    },
  ])
})
