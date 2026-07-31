import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory'

import type { FundDistributionTableModel } from '../models/fundDistributionTableModel'

export function toFundDistributionTableModel(
  history: FundDistributionHistory,
): FundDistributionTableModel {
  return {
    conversions: history.conversions.map((record, index) => ({
      conversionDate: record.conversionDate,
      conversionType: '份额折算',
      ratio: record.ratio === null ? '--' : `1:${record.ratio.toFixed(4)}`,
      rowKey: `${history.fundCode}:conversion:${record.conversionDate}:${index}`,
    })),
    dividends: history.dividends.map((record, index) => ({
      dividendPerTenUnits:
        record.dividendPerTenUnits === null ? '--' : record.dividendPerTenUnits.toFixed(4),
      equityRecordDate: record.equityRecordDate ?? '--',
      exDividendDate: record.exDividendDate,
      paymentDate: record.paymentDate ?? '--',
      rowKey: `${history.fundCode}:dividend:${record.exDividendDate}:${index}`,
    })),
  }
}
