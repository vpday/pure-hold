import type {
  FundDistributionHistory,
  FundDividendDistribution,
  FundShareConversion,
} from '../../models/fundDistributionHistory.ts'
import type {
  TiantianFundDistributionDataDto,
  TiantianFundDistributionRecordDto,
} from './tiantianFundDistributionDto.ts'
import { isSuccessfulTiantianResponse } from './tiantianResponse.ts'

export function parseTiantianFundDistributionResponse(
  value: unknown,
  fundCode: string,
): FundDistributionHistory {
  if (!isSuccessfulTiantianResponse(value)) {
    throw new TypeError('基金分红送配服务返回了无效数据')
  }
  if (value.data === null && value.totalCount === 0) {
    return { conversions: [], dividends: [], fundCode }
  }
  if (!isRecord(value.data)) throw new TypeError('基金分红送配服务返回了无效数据')

  const data = value.data as TiantianFundDistributionDataDto
  const dividendValues = toRecords(data.FHINFO)
  const conversionValues = toRecords(data.FCINFO)
  const dividends: FundDividendDistribution[] = []
  const conversions: FundShareConversion[] = []

  for (const record of [...dividendValues, ...conversionValues]) {
    if (!isRecord(record)) continue
    const dto = record as TiantianFundDistributionRecordDto
    if (!isValidDate(dto.FSRQ)) continue
    const category = toCategory(dto.FHFCBZ)
    if (category === 0) {
      dividends.push({
        dividendPerTenUnits: toNullableNumber(dto.FHFCZ10),
        equityRecordDate: toNullableDate(dto.DJR),
        exDividendDate: dto.FSRQ,
        paymentDate: toNullableDate(dto.FFR),
      })
    } else if (category === 106) {
      conversions.push({
        conversionDate: dto.FSRQ,
        ratio: toNullableNumber(dto.FHFCZ),
      })
    }
  }

  dividends.sort((left, right) => right.exDividendDate.localeCompare(left.exDividendDate))
  conversions.sort((left, right) => right.conversionDate.localeCompare(left.conversionDate))
  return { conversions, dividends, fundCode }
}

function toRecords(value: unknown): readonly unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new TypeError('基金分红送配服务返回了无效数据')
  }
  return value
}

function toCategory(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return undefined
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return null
  }
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN
  return Number.isFinite(number) ? number : null
}

function toNullableDate(value: unknown): string | null {
  return isValidDate(value) ? value : null
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
