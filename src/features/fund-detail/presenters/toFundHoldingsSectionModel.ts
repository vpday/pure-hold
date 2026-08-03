import type { FundHoldingQuote } from '@/domains/funds/models/fundHoldingQuote.ts'
import type {
  FundHoldingChangeType,
  FundHoldingsDisclosure,
} from '@/domains/funds/models/fundHoldingsDisclosure.ts'
import type {
  FundBondHoldingRow,
  FundHoldingsSectionModel,
  FundHoldingsTrend,
  FundStockHoldingRow,
} from '../models/fundHoldingsSectionModel.ts'

export interface FundHoldingsSectionState {
  readonly activeView: FundHoldingsSectionModel['activeView']
  readonly disclosure?: FundHoldingsDisclosure
  readonly holdingsError: string
  readonly holdingsWarning: string
  readonly isDatesLoading: boolean
  readonly isHoldingsLoading: boolean
  readonly isQuotesLoading: boolean
  readonly quotes: readonly FundHoldingQuote[]
  readonly quoteWarning: string
  readonly reportDates: readonly string[]
  readonly selectedReportDate?: string
}

export function toFundHoldingsSectionModel(
  state: FundHoldingsSectionState,
): FundHoldingsSectionModel {
  const quotes = new Map(state.quotes.map((quote) => [`${quote.market}:${quote.code}`, quote]))
  const stocks =
    state.disclosure?.stocks.map((holding) => {
      const quote = holding.market ? quotes.get(`${holding.market}:${holding.code}`) : undefined
      return {
        changeText: formatHoldingChange(holding.changeType, holding.changePercent),
        changeTrend: holdingChangeTrend(holding.changeType),
        code: holding.code,
        dailyChangePercentText: formatDailyChange(quote?.dailyChangePercent ?? null),
        heavyQuarterText:
          holding.heavyQuarterCount === null ? null : `重仓 ${holding.heavyQuarterCount} 个季度`,
        industryName: holding.industryName,
        name: holding.name,
        netAssetPercentText: formatPercent(holding.netAssetPercent),
        priceText: formatNumber(quote?.latestPrice ?? null, 3),
        priceTrend: quoteTrend(quote?.dailyChangePercent ?? null),
      } satisfies FundStockHoldingRow
    }) ?? []
  const bonds =
    state.disclosure?.bonds.map((holding) => {
      const quote = holding.market ? quotes.get(`${holding.market}:${holding.code}`) : undefined
      return {
        code: holding.code,
        dailyChangePercentText: formatDailyChange(quote?.dailyChangePercent ?? null),
        name: holding.name,
        netAssetPercentText: formatPercent(holding.netAssetPercent),
        priceText: formatNumber(quote?.latestPrice ?? null, 3),
        priceTrend: quoteTrend(quote?.dailyChangePercent ?? null),
      } satisfies FundBondHoldingRow
    }) ?? []

  return {
    activeView: state.activeView,
    bondTotalLabel: `前 ${bonds.length} 只持仓占比合计`,
    bondTotalText: formatPercent(sumPercent(state.disclosure?.bonds ?? [])),
    bonds,
    holdingsError: state.holdingsError,
    holdingsWarning: state.holdingsWarning,
    isDatesLoading: state.isDatesLoading,
    isHoldingsLoading: state.isHoldingsLoading,
    isQuotesLoading: state.isQuotesLoading,
    quoteWarning: state.quoteWarning,
    reportDateOptions: state.reportDates.map((date) => ({ label: date, value: date })),
    reportDateText: state.disclosure?.reportDate ?? '--',
    selectedReportDate: state.selectedReportDate ?? '',
    stockTotalLabel: `前 ${stocks.length} 只持仓占比合计`,
    stockTotalText: formatPercent(sumPercent(state.disclosure?.stocks ?? [])),
    stocks,
  }
}

function sumPercent(holdings: readonly { readonly netAssetPercent: number | null }[]): number {
  return holdings.reduce((total, holding) => total + (holding.netAssetPercent ?? 0), 0)
}

function formatHoldingChange(type: FundHoldingChangeType, value: number | null): string {
  if (type === 'new') return '新增'
  if (type === 'unchanged') return '持平'
  if (value === null) return '--'
  if (type === 'increased') return `↑ ${formatNumber(value, 2)}%`
  if (type === 'decreased') return `↓ ${formatNumber(value, 2)}%`
  return '--'
}

function holdingChangeTrend(type: FundHoldingChangeType): FundHoldingsTrend {
  if (type === 'increased') return 'up'
  if (type === 'decreased') return 'down'
  if (type === 'new' || type === 'unchanged') return 'neutral'
  return 'unknown'
}

function formatPercent(value: number | null): string {
  const text = formatNumber(value, 2)
  return text === '--' ? text : `${text}%`
}

function formatDailyChange(value: number | null): string {
  if (value === null) return '--'
  return `${value >= 0 ? '+' : ''}${formatNumber(value, 2)}%`
}

function formatNumber(value: number | null, maximumDecimals: number): string {
  if (value === null || !Number.isFinite(value)) return '--'
  return value.toFixed(maximumDecimals).replace(/\.?0+$/, '')
}

function quoteTrend(value: number | null): FundHoldingsTrend {
  if (value === null) return 'unknown'
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'neutral'
}
