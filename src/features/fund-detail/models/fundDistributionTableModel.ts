import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory'

export type LoadFundDistribution = (
  fundCode: string,
  signal?: AbortSignal,
) => Promise<FundDistributionHistory>

export interface FundDividendTableRow {
  readonly dividendPerTenUnits: string
  readonly equityRecordDate: string
  readonly exDividendDate: string
  readonly paymentDate: string
  readonly rowKey: string
}

export interface FundConversionTableRow {
  readonly conversionDate: string
  readonly conversionType: string
  readonly ratio: string
  readonly rowKey: string
}

export interface FundDistributionTableModel {
  readonly conversions: readonly FundConversionTableRow[]
  readonly dividends: readonly FundDividendTableRow[]
}
