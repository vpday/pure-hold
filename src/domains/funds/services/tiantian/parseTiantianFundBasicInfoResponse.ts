import type { FundBasicInfo } from '../../models/fundBasicInfo.ts'
import type {
  TiantianFundBasicInfoDto,
  TiantianFundBasicInfoResponse,
} from './tiantianFundBasicInfoDto.ts'

export function parseTiantianFundBasicInfoResponse(
  value: unknown,
  requestedCode: string,
): FundBasicInfo {
  if (!isSuccessfulResponse(value)) {
    throw new Error('Tiantian fund basic info business response failed')
  }

  const matches = value.data.filter(
    (item): item is TiantianFundBasicInfoDto => isRecord(item) && item.FCODE === requestedCode,
  )
  if (matches.length !== 1) {
    throw new Error('Tiantian fund basic info record is missing or duplicated')
  }

  const record = matches[0]
  return {
    code: requestedCode,
    companyName: toText(record.JJGS),
    establishedDate: toText(record.ESTABDATE),
    fundType: toText(record.FTYPE),
    morningstarRating: toRating(record.RLEVEL_CX),
    netAssetsYuan: toNonNegativeNumber(record.ENDNAV),
    netAssetsDate: toText(record.FEGMRQ),
    riskLevel: toRating(record.RISKLEVEL),
    shanghaiRating: toRating(record.RLEVEL_SZ),
    trackingError: toFiniteNumber(record.TRKERROR),
    trackingIndexName: toText(record.INDEXNAME),
  }
}

function isSuccessfulResponse(value: unknown): value is TiantianFundBasicInfoResponse & {
  readonly data: readonly unknown[]
  readonly errorCode: 0
  readonly success: true
} {
  return (
    isRecord(value) &&
    value.success === true &&
    value.errorCode === 0 &&
    Array.isArray(value.data) &&
    value.data.length > 0
  )
}

function toText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const text = value.trim()
  return text || null
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === '' || typeof value === 'boolean') {
    return null
  }
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

function toNonNegativeNumber(value: unknown): number | null {
  const number = toFiniteNumber(value)
  return number !== null && number >= 0 ? number : null
}

function toRating(value: unknown): number | null {
  const number = toFiniteNumber(value)
  return number !== null && Number.isInteger(number) && number >= 1 && number <= 5 ? number : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
