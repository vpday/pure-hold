import {
  csi300TotalReturnIndexCode,
  csi300TotalReturnIndexName,
  csi300TotalReturnStartDate,
  type IndexPerformanceHistory,
  type IndexPerformanceHistoryIssue,
  type IndexPerformancePoint,
} from '../../models/indexPerformanceHistory.ts'

export function parseCsindexPerformanceResponse(
  response: unknown,
  endDate: string,
): IndexPerformanceHistory {
  if (
    !isRecord(response) ||
    response.code !== '200' ||
    response.success !== true ||
    !Array.isArray(response.data)
  ) {
    throw new Error('CSIndex performance response was unsuccessful')
  }

  const pointsByDate = new Map<string, IndexPerformancePoint>()
  let duplicateCount = 0
  let malformedCount = 0

  for (const record of response.data) {
    if (!isRecord(record)) {
      malformedCount += 1
      continue
    }
    if (
      record.indexCode !== csi300TotalReturnIndexCode ||
      record.indexNameCnAll !== csi300TotalReturnIndexName
    ) {
      throw new Error('CSIndex performance response index identity is invalid')
    }
    const date = toIsoDate(record.tradeDate)
    const value = toPositiveNumber(record.close)
    if (
      !date ||
      date < compactToIso(csi300TotalReturnStartDate) ||
      date > compactToIso(endDate) ||
      !value
    ) {
      malformedCount += 1
      continue
    }
    if (pointsByDate.has(date)) duplicateCount += 1
    if (!pointsByDate.has(date)) pointsByDate.set(date, { date, value })
  }

  const points = [...pointsByDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  )
  if (points.length === 0) throw new Error('CSIndex performance response has no valid points')

  const issues: IndexPerformanceHistoryIssue[] = []
  if (malformedCount > 0) issues.push({ code: 'malformed-record', count: malformedCount })
  if (duplicateCount > 0) issues.push({ code: 'duplicate-date', count: duplicateCount })
  if (points[0]?.date !== compactToIso(csi300TotalReturnStartDate)) {
    issues.push({ code: 'missing-start-date', count: 1 })
  }

  return {
    endDate,
    indexCode: csi300TotalReturnIndexCode,
    indexName: csi300TotalReturnIndexName,
    issues,
    points,
    startDate: csi300TotalReturnStartDate,
  }
}

function compactToIso(value: string): string {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function toIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return undefined
  const iso = compactToIso(value)
  const date = new Date(`${iso}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? undefined : iso
}

function toPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  const result = typeof value === 'number' ? value : Number(value.trim())
  return Number.isFinite(result) && result > 0 ? result : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
