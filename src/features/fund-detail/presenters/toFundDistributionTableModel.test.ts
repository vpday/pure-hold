import assert from 'node:assert/strict'
import test from 'node:test'

import { toFundDistributionTableModel } from './toFundDistributionTableModel.ts'

test('formats distribution values and nulls for direct table rendering', () => {
  assert.deepEqual(
    toFundDistributionTableModel({
      conversions: [
        { conversionDate: '2020-12-15', ratio: 1.005444122 },
        { conversionDate: '2019-01-01', ratio: null },
      ],
      dividends: [
        {
          dividendPerTenUnits: 0.45,
          equityRecordDate: '2021-12-31',
          exDividendDate: '2021-12-31',
          paymentDate: '2022-01-05',
        },
        {
          dividendPerTenUnits: null,
          equityRecordDate: null,
          exDividendDate: '2020-01-01',
          paymentDate: null,
        },
      ],
      fundCode: '161725',
    }),
    {
      conversions: [
        {
          conversionDate: '2020-12-15',
          conversionType: '份额折算',
          ratio: '1:1.0054',
          rowKey: '161725:conversion:2020-12-15:0',
        },
        {
          conversionDate: '2019-01-01',
          conversionType: '份额折算',
          ratio: '--',
          rowKey: '161725:conversion:2019-01-01:1',
        },
      ],
      dividends: [
        {
          dividendPerTenUnits: '0.4500',
          equityRecordDate: '2021-12-31',
          exDividendDate: '2021-12-31',
          paymentDate: '2022-01-05',
          rowKey: '161725:dividend:2021-12-31:0',
        },
        {
          dividendPerTenUnits: '--',
          equityRecordDate: '--',
          exDividendDate: '2020-01-01',
          paymentDate: '--',
          rowKey: '161725:dividend:2020-01-01:1',
        },
      ],
    },
  )
})
