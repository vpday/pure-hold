import type { EastmoneyIndexQuoteDto, EastmoneyQuoteParseResult } from './eastmoneyIndexQuoteDto'

export function parseEastmoneyIndexQuoteResponse(response: unknown): EastmoneyQuoteParseResult {
  if (!isRecord(response) || response.rc !== 0 || !isRecord(response.data)) {
    throw new Error('Eastmoney quotes response was unsuccessful')
  }

  const diff = response.data.diff
  if (!Array.isArray(diff)) {
    throw new Error('Eastmoney quotes response is missing data.diff')
  }

  const dtos: EastmoneyIndexQuoteDto[] = []
  let malformedRecordCount = 0

  for (const record of diff) {
    if (!isRecord(record) || !isCodePart(record.f12) || !isCodePart(record.f13)) {
      malformedRecordCount += 1
      continue
    }

    dtos.push({
      changeAmount: record.f4,
      changePercent: record.f3,
      price: record.f2,
      quoteCode: `${record.f13}.${record.f12}`,
      quotedAt: record.f124,
      securityCode: String(record.f12),
      sourceName: record.f14,
    })
  }

  return { dtos, malformedRecordCount }
}

function isCodePart(value: unknown): value is number | string {
  return (
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.length > 0)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
