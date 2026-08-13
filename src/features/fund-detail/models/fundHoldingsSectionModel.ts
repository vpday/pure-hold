import type {
  FundHoldingMarket,
  FundStockHoldingsSource,
} from '@/domains/funds/models/fundHoldingsDisclosure.ts'
import type { FundAssetAllocationChartModel } from './fundAssetAllocationChart.ts'

export type FundHoldingsView = 'positions' | 'allocation'
export type FundHoldingsTrend = 'down' | 'neutral' | 'unknown' | 'up'

export interface FundAssetAllocationPanelModel {
  readonly chart?: FundAssetAllocationChartModel
  readonly error: string
  readonly isLoading: boolean
  readonly warning: string
}

export interface FundHoldingsReportDateOption {
  readonly label: string
  readonly value: string
}

export interface FundStockHoldingRow {
  readonly changeText: string
  readonly changeTrend: FundHoldingsTrend
  readonly code: string
  readonly dailyChangePercentText: string
  readonly heavyQuarterText: string | null
  readonly industryName: string | null
  readonly market: FundHoldingMarket | null
  readonly name: string
  readonly netAssetPercentText: string
  readonly priceText: string
  readonly priceTrend: FundHoldingsTrend
}

export interface FundBondHoldingRow {
  readonly code: string
  readonly dailyChangePercentText: string
  readonly name: string
  readonly netAssetPercentText: string
  readonly priceText: string
  readonly priceTrend: FundHoldingsTrend
}

export interface FundHoldingsSectionModel {
  readonly activeView: FundHoldingsView
  readonly allocation: FundAssetAllocationPanelModel
  readonly bondTotalLabel: string
  readonly bondTotalText: string
  readonly bonds: readonly FundBondHoldingRow[]
  readonly holdingsError: string
  readonly holdingsWarning: string
  readonly isDatesLoading: boolean
  readonly isHoldingsLoading: boolean
  readonly isQuotesLoading: boolean
  readonly quoteWarning: string
  readonly reportDateOptions: readonly FundHoldingsReportDateOption[]
  readonly reportDateText: string
  readonly selectedReportDate: string
  readonly stockTotalLabel: string
  readonly stockTotalText: string
  readonly stockHoldingsSource?: FundStockHoldingsSource
  readonly stocks: readonly FundStockHoldingRow[]
}
