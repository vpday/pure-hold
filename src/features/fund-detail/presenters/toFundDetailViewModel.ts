import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo'
import type { FundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics'
import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot'
import { formatRowDate } from '@/shared/presenters/formatRowDate'
import type {
  FundDetailHoldingViewModel,
  FundDetailIncomeViewModel,
  FundDetailTrend,
  FundDetailViewModel,
  FundTradingRulesViewModel,
  FundTradingStatusTone,
} from '../models/fundDetailViewModel'

const riskNames = ['低', '中低', '中', '中高', '高'] as const
const successStatuses = new Set(['开放申购', '开放赎回'])
const warningStatuses = new Set(['限大额', '限制申购'])
const errorStatuses = new Set(['暂停申购', '暂停赎回', '封闭期'])

export function toFundDetailViewModel(
  snapshot: FundSnapshot,
  basicInfo?: FundBasicInfo,
  holdingMetrics?: FundHoldingMetrics,
): FundDetailViewModel {
  return {
    code: snapshot.code,
    companyName: basicInfo?.companyName ?? '--',
    dailyChangePercentText: formatPercent(snapshot.dailyChangePercent),
    dailyChangeTrend: toTrend(snapshot.dailyChangePercent),
    establishedDateText: formatRowDate(basicInfo?.establishedDate ?? '--'),
    estimatedAtTimeText: formatRowDate(snapshot.estimatedAt ?? '--'),
    estimatedNavText: formatNumber(snapshot.estimatedNav, 4),
    fundType: basicInfo?.fundType ?? '--',
    holding: holdingMetrics ? toHoldingViewModel(holdingMetrics) : null,
    morningstarRating: basicInfo?.morningstarRating ?? null,
    name: snapshot.name,
    navDateText: formatCompactDate(snapshot.navDate),
    navText: formatNumber(snapshot.nav, 4),
    netAssetsDateText: formatCompactDate(basicInfo?.netAssetsDate),
    netAssetsText: formatNetAssets(basicInfo?.netAssetsYuan),
    oneYearReturnText: formatPercent(snapshot.returns.oneYear),
    oneYearReturnTrend: toTrend(snapshot.returns.oneYear),
    riskText: formatRisk(basicInfo?.riskLevel),
    shanghaiRating: basicInfo?.shanghaiRating ?? null,
    trackingErrorText: formatNumber(basicInfo?.trackingError ?? null, 4),
    trackingIndexName: basicInfo?.trackingIndexName ?? '--',
    tradingRules: basicInfo ? toTradingRulesViewModel(basicInfo) : null,
  }
}

function toHoldingViewModel(metrics: FundHoldingMetrics): FundDetailHoldingViewModel {
  return {
    estimatedIncome: toIncomeViewModel(metrics.estimatedIncome, metrics.estimatedIncomePercent),
    holdingAmountText: formatCurrency(metrics.holdingAmount),
    holdingDaysText: metrics.holdingDays === null ? '--' : `${metrics.holdingDays} 天`,
    holdingIncome: toIncomeViewModel(metrics.holdingIncome, metrics.holdingIncomePercent),
    todayIncome: toIncomeViewModel(metrics.todayIncome, metrics.todayIncomePercent),
    yesterdayIncome: toIncomeViewModel(metrics.yesterdayIncome, metrics.yesterdayIncomePercent),
  }
}

function toIncomeViewModel(
  amount: number | null,
  percent: number | null,
): FundDetailIncomeViewModel {
  return {
    amountText: formatSignedNumber(amount),
    percentText: formatPercent(percent),
    trend: toTrend(amount),
  }
}

function toTradingRulesViewModel(basicInfo: FundBasicInfo): FundTradingRulesViewModel {
  let purchaseDiscountText: string | null = null
  let standardPurchaseFeeText: string | null = null
  if (
    basicInfo.purchaseFeePercent !== null &&
    basicInfo.standardPurchaseFeePercent !== null &&
    basicInfo.standardPurchaseFeePercent > 0 &&
    basicInfo.purchaseFeePercent < basicInfo.standardPurchaseFeePercent
  ) {
    purchaseDiscountText = `${formatCompactNumber(
      (basicInfo.purchaseFeePercent / basicInfo.standardPurchaseFeePercent) * 10,
    )}折`
    standardPurchaseFeeText = formatRate(basicInfo.standardPurchaseFeePercent)
  }

  const purchaseStatus = formatTradingStatus(basicInfo.purchaseStatus)
  const redemptionStatus = formatTradingStatus(basicInfo.redemptionStatus)

  return {
    custodyFeeText: formatAnnualFee(basicInfo.custodyFeePercent),
    dailyPurchaseLimitText: formatAmount(basicInfo.dailyPurchaseLimitYuan),
    managementFeeText: formatAnnualFee(basicInfo.managementFeePercent),
    minimumPurchaseAmountText: formatAmount(basicInfo.minimumPurchaseAmountYuan),
    purchaseConfirmationText: formatConfirmationDays(basicInfo.purchaseConfirmationDays),
    purchaseDiscountText,
    purchaseFeeText: formatRate(basicInfo.purchaseFeePercent),
    purchaseStatusText: purchaseStatus.text,
    purchaseStatusTone: purchaseStatus.tone,
    redemptionConfirmationText: formatConfirmationDays(basicInfo.redemptionConfirmationDays),
    redemptionFundsArrivalText: formatConfirmationDays(basicInfo.redemptionFundsArrivalDays),
    redemptionStatusText: redemptionStatus.text,
    redemptionStatusTone: redemptionStatus.tone,
    salesServiceFeeText: formatAnnualFee(basicInfo.salesServiceFeePercent),
    standardPurchaseFeeText,
  }
}

function formatAmount(value: number | null): string {
  if (value === null) return '--'
  if (value < 10_000) return `${formatCompactNumber(value)}元`
  if (value < 100_000_000) return `${formatCompactNumber(value / 10_000)}万元`
  return `${formatCompactNumber(value / 100_000_000)}亿元`
}

function formatAnnualFee(value: number | null): string {
  return value === null ? '--' : `${formatRate(value)}（每年）`
}

function formatCompactNumber(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '')
}

function formatConfirmationDays(value: number | null): string {
  return value === null ? '--' : `T+${value}`
}

function formatRate(value: number | null): string {
  return value === null ? '--' : `${formatCompactNumber(value)}%`
}

function formatTradingStatus(value: string | null): {
  readonly text: string
  readonly tone: FundTradingStatusTone
} {
  if (value === null) return { text: '--', tone: 'neutral' }
  if (successStatuses.has(value)) return { text: value, tone: 'success' }
  if (warningStatuses.has(value)) return { text: value, tone: 'warning' }
  if (errorStatuses.has(value)) return { text: value, tone: 'error' }
  return { text: value, tone: 'neutral' }
}

function formatNumber(value: number | null, digits: number): string {
  return value === null ? '--' : value.toFixed(digits)
}

function formatCurrency(value: number | null): string {
  return value === null ? '--' : `¥${formatAbsolute(value)}`
}

function formatSignedNumber(value: number | null): string {
  if (value === null) return '--'
  if (value === 0) return '0.00'
  return `${value > 0 ? '+' : '-'}${formatAbsolute(value)}`
}

function formatAbsolute(value: number): string {
  return Math.abs(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
}

function formatPercent(value: number | null): string {
  if (value === null) return '--'
  const text = `${value.toFixed(2)}%`
  return value > 0 ? `+${text}` : text
}

function formatRisk(value: number | null | undefined): string {
  if (value === undefined || value === null || !riskNames[value - 1]) {
    return '风险等级未知'
  }
  return `R${value} ${riskNames[value - 1]}风险`
}

function formatNetAssets(value: number | null | undefined): string {
  return value === undefined || value === null ? '--' : `${(value / 100_000_000).toFixed(2)} 亿元`
}

function formatCompactDate(value: string | null | undefined): string {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  return match?.[2] && match[3] ? `${match[2]}-${match[3]}` : '--'
}

function toTrend(value: number | null): FundDetailTrend {
  if (value === null) return 'unknown'
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}
