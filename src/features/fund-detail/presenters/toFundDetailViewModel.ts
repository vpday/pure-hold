import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo'
import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot'
import type { FundDetailTrend, FundDetailViewModel } from '../models/fundDetailViewModel'

const riskNames = ['低', '中低', '中', '中高', '高'] as const

export function toFundDetailViewModel(
  snapshot: FundSnapshot,
  basicInfo?: FundBasicInfo,
): FundDetailViewModel {
  return {
    code: snapshot.code,
    companyName: basicInfo?.companyName ?? '--',
    dailyChangePercentText: formatPercent(snapshot.dailyChangePercent),
    dailyChangeTrend: toTrend(snapshot.dailyChangePercent),
    establishedDateText: formatFullDate(basicInfo?.establishedDate),
    fundType: basicInfo?.fundType ?? '--',
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
  }
}

function formatNumber(value: number | null, digits: number): string {
  return value === null ? '--' : value.toFixed(digits)
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

function formatFullDate(value: string | null | undefined): string {
  return value ?? '--'
}

function toTrend(value: number | null): FundDetailTrend {
  if (value === null) return 'unknown'
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}
