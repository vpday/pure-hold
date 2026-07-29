import type {
  FundCumulativeReturnPoint,
  FundCumulativeReturns,
  FundPerformanceRange,
} from '../../models/fundCumulativeReturns.ts'
import type {
  EastmoneyFundCumulativeReturnDto,
  EastmoneyFundCumulativeReturnsResponse,
} from './eastmoneyFundCumulativeReturnsDto.ts'

export function parseEastmoneyFundCumulativeReturnsResponse(
  value: unknown,
  fundCode: string,
  referenceIndexCode: string,
  range: FundPerformanceRange,
): FundCumulativeReturns {
  if (
    !isRecord(value) ||
    value.success !== true ||
    value.errorCode !== 0 ||
    !Array.isArray(value.data)
  ) {
    throw new TypeError('累计收益服务返回了无效数据')
  }

  const response = value as EastmoneyFundCumulativeReturnsResponse
  const pointsByDate = new Map<string, FundCumulativeReturnPoint>()
  for (const value of response.data as unknown[]) {
    const point = mapPoint(value)
    if (point) pointsByDate.set(point.date, point)
  }
  const points = [...pointsByDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  )
  if (points.length === 0) {
    throw new TypeError('累计收益数据为空')
  }

  const maximumDrawdownPercent = isRecord(response.expansion)
    ? toNullableNonNegativeNumber(response.expansion.MAXRETRA)
    : null
  return { fundCode, maximumDrawdownPercent, points, range, referenceIndexCode }
}

function mapPoint(value: unknown): FundCumulativeReturnPoint | undefined {
  if (!isRecord(value)) return undefined
  const dto = value as EastmoneyFundCumulativeReturnDto
  if (!isValidDate(dto.PDATE)) return undefined
  return {
    date: dto.PDATE,
    fundTypeYieldPercent: toNullableYield(dto.FUNDTYPEYIELD),
    fundYieldPercent: toNullableYield(dto.YIELD),
    referenceIndexYieldPercent: toNullableYield(dto.INDEXYIELD),
  }
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function toNullableYield(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return null
  }
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

function toNullableNonNegativeNumber(value: unknown): number | null {
  const number = toNullableYield(value)
  return number !== null && number >= 0 ? number : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
