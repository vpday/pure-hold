import type { FundMarketData } from '../../models/fundMarketData.ts'
import type { TiantianFundDto } from './tiantianFundDto.ts'

export function mapTiantianFundMarketData(
  dto: TiantianFundDto,
  fetchedAt: number,
): FundMarketData | null {
  const code = toRequiredString(dto.FCODE)
  const name = toRequiredString(dto.SHORTNAME)
  if (!code || !name) {
    return null
  }

  return {
    code,
    dailyChangePercent: toNullableNumber(dto.NAVCHGRT),
    estimatedAt: toNullableString(dto.GZTIME),
    estimatedChangePercent: toNullableNumber(dto.GSZZL),
    estimatedNav: toNullableNumber(dto.GSZ),
    fetchedAt,
    name,
    nav: toNullableNumber(dto.NAV),
    navDate: toNullableString(dto.PDATE),
    returns: {
      fiveYears: toNullableNumber(dto.SYL_5N),
      oneMonth: toNullableNumber(dto.SYL_Y),
      oneWeek: toNullableNumber(dto.SYL_Z),
      oneYear: toNullableNumber(dto.SYL_1N),
      sinceInception: toNullableNumber(dto.SYL_LN),
      sixMonths: toNullableNumber(dto.SYL_6Y),
      threeMonths: toNullableNumber(dto.SYL_3Y),
      threeYears: toNullableNumber(dto.SYL_3N),
      twoYears: toNullableNumber(dto.SYL_2N),
      yearToDate: toNullableNumber(dto.SYL_JN),
    },
    returnsDate: toNullableString(dto.SYRQ),
    tags: extractTags(dto.LABELINFO),
  }
}

function toRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function toNullableString(value: unknown): string | null {
  return toRequiredString(value)
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

function extractTags(value: unknown): string[] {
  if (!isRecord(value)) {
    return []
  }
  const tags = new Set<string>()
  const favorite = Array.isArray(value.FAVOR)
    ? [...value.FAVOR].sort((left, right) => featureOrder(left) - featureOrder(right))[0]
    : undefined
  addTag(favorite)
  if (Array.isArray(value.FAVOR_ED)) {
    value.FAVOR_ED.forEach(addTag)
  }
  return [...tags]

  function addTag(current: unknown): void {
    if (!isRecord(current)) return
    const featureName = toRequiredString(current.FEANAME)
    if (featureName) tags.add(featureName)
  }
}

function featureOrder(value: unknown): number {
  if (!isRecord(value)) return Number.POSITIVE_INFINITY
  return toNullableNumber(value.FEAORDER) ?? Number.POSITIVE_INFINITY
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
