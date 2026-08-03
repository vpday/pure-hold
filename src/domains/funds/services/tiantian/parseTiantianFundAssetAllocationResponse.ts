import type {
  FundAssetAllocation,
  FundAssetAllocationPoint,
} from '../../models/fundAssetAllocation.ts'
import type { TiantianFundAssetAllocationDto } from './tiantianFundAssetAllocationDto.ts'
import { isSuccessfulTiantianResponse } from './tiantianResponse.ts'

const invalidDataMessage = '基金资产配置数据为空或无效'

export function parseTiantianFundAssetAllocationResponse(
  value: unknown,
  fundCode: string,
): FundAssetAllocation {
  if (!isSuccessfulTiantianResponse(value) || !Array.isArray(value.data)) {
    throw new TypeError(invalidDataMessage)
  }

  const pointsByDate = new Map<string, FundAssetAllocationPoint>()
  for (const item of value.data) {
    const point = mapPoint(item, fundCode)
    if (point) pointsByDate.set(point.date, point)
  }
  const points = [...pointsByDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  )
  if (points.length === 0) throw new TypeError(invalidDataMessage)

  return { fundCode, points }
}

function mapPoint(value: unknown, fundCode: string): FundAssetAllocationPoint | undefined {
  if (!isRecord(value)) return undefined
  const dto = value as TiantianFundAssetAllocationDto
  if (!isValidDate(dto.FSRQ) || hasMismatchedFundCode(dto.BZDM, fundCode)) return undefined

  const point = {
    bondPercent: toNullableNonNegativeNumber(dto.ZQ),
    cashPercent: toNullableNonNegativeNumber(dto.HB),
    date: dto.FSRQ,
    netAssetValue: toNullableNonNegativeNumber(dto.JZC),
    stockPercent: toNullableNonNegativeNumber(dto.GP),
  }
  if (
    point.bondPercent === null &&
    point.cashPercent === null &&
    point.netAssetValue === null &&
    point.stockPercent === null
  ) {
    return undefined
  }
  return point
}

function hasMismatchedFundCode(value: unknown, fundCode: string): boolean {
  return typeof value === 'string' && value !== '' && value !== fundCode
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function toNullableNonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return null
  }
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) && number >= 0 ? number : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
