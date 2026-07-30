import type { FundReferenceIndexOption } from '../models/fundCumulativeReturnsChart'

const defaultReferenceIndexes: readonly FundReferenceIndexOption[] = [
  { code: '000001', name: '上证指数' },
  { code: '399001', name: '深证指数' },
  { code: '399006', name: '创业板指' },
  { code: '000300', name: '沪深300' },
  { code: '399005', name: '中小板指' },
  { code: '000905', name: '中证500' },
  { code: '000016', name: '上证50' },
]

export function buildFundReferenceIndexOptions(
  trackingIndexCode: string | null | undefined,
  trackingIndexName: string | null | undefined,
): readonly FundReferenceIndexOption[] {
  const code = trackingIndexCode?.trim() ?? ''
  const name = trackingIndexName?.trim() ?? ''
  const candidates =
    /^\d{6}$/.test(code) && name
      ? [{ code, name }, ...defaultReferenceIndexes]
      : defaultReferenceIndexes
  const seen = new Set<string>()
  return candidates.filter(({ code }) => {
    if (seen.has(code)) return false
    seen.add(code)
    return true
  })
}
