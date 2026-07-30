import type { FundNetValueHistory, FundNetValuePoint } from '../../models/fundNetValueHistory.ts'
import type { FundHistoryRange } from '../../models/fundHistoryRange.ts'
import type {
  TiantianFundNetValueHistoryResponse,
  TiantianFundNetValuePointDto,
} from './tiantianFundNetValueHistoryDto.ts'

export function parseTiantianFundNetValueHistoryResponse(
  value: unknown,
  fundCode: string,
  range: FundHistoryRange,
): FundNetValueHistory {
  if (
    !isRecord(value) ||
    value.success !== true ||
    value.errorCode !== 0 ||
    !Array.isArray(value.data)
  ) {
    throw new TypeError('基金净值历史服务返回了无效数据')
  }

  const response = value as TiantianFundNetValueHistoryResponse
  const pointsByDate = new Map<string, FundNetValuePoint>()
  for (const value of response.data as unknown[]) {
    const point = mapPoint(value)
    if (point) pointsByDate.set(point.date, point)
  }
  const points = [...pointsByDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  )
  if (points.length === 0) {
    throw new TypeError('基金净值历史数据为空')
  }

  return { fundCode, points, range }
}

function mapPoint(value: unknown): FundNetValuePoint | undefined {
  if (!isRecord(value)) return undefined
  const dto = value as TiantianFundNetValuePointDto
  if (!isValidDate(dto.FSRQ)) return undefined
  return {
    cumulativeNetValue: toNullableNumber(dto.LJJZ),
    dailyGrowthPercent: toNullableNumber(dto.JZZZL),
    date: dto.FSRQ,
    unitNetValue: toNullableNumber(dto.DWJZ),
  }
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return null
  }
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
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
