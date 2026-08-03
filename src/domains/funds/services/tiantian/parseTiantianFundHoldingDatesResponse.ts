import { isSuccessfulTiantianResponse } from './tiantianResponse.ts'

const invalidResponseMessage = '基金持仓报告日期服务返回了无效数据'

export function parseTiantianFundHoldingDatesResponse(value: unknown): readonly string[] {
  if (!isSuccessfulTiantianResponse(value) || !Array.isArray(value.data)) {
    throw new Error(invalidResponseMessage)
  }
  const dates: string[] = []
  const seen = new Set<string>()
  for (const date of value.data) {
    if (!isValidDate(date)) throw new Error(invalidResponseMessage)
    if (!seen.has(date)) {
      seen.add(date)
      dates.push(date)
    }
  }
  if (dates.length === 0) throw new Error(invalidResponseMessage)
  return dates
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  )
}
