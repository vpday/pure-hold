import type { IndexDefinition } from '../../models/indexDefinition'
import type { IndexQuoteBatch, IndexQuoteSnapshot } from '../../models/indexQuote'
import type { IndexQuoteIssue } from '../../models/indexQuoteIssue'
import { createEastmoneyQuoteRequestUrl } from './createEastmoneyQuoteRequestUrl'
import { mapEastmoneyIndexQuote } from './mapEastmoneyIndexQuote'
import { parseEastmoneyIndexQuoteResponse } from './parseEastmoneyIndexQuoteResponse'

const requestTimeout = 10_000

export async function fetchEastmoneyIndexQuotes(
  definitions: readonly IndexDefinition[],
  signal: AbortSignal,
): Promise<IndexQuoteBatch> {
  if (definitions.length === 0) {
    return { fetchedAt: Date.now(), issues: [], quotes: [] }
  }

  const requestUrl = createEastmoneyQuoteRequestUrl(definitions)
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(requestTimeout)])
  const response = await fetch(requestUrl, { signal: requestSignal })

  if (!response.ok) {
    throw new Error(`Eastmoney quotes request failed with status ${response.status}`)
  }

  const parsed = parseEastmoneyIndexQuoteResponse(await response.json())
  const dtoByQuoteCode = new Map(parsed.dtos.map((dto) => [dto.quoteCode, dto]))
  const issues: IndexQuoteIssue[] = Array.from({ length: parsed.malformedRecordCount }, () => ({
    code: 'malformed-record',
    indexId: 'batch',
  }))
  const quotes: IndexQuoteSnapshot[] = []

  for (const definition of definitions) {
    const dto = dtoByQuoteCode.get(definition.quoteCode)
    if (!dto) {
      issues.push({ code: 'missing-response', indexId: definition.id })
      continue
    }

    const result = mapEastmoneyIndexQuote(definition, dto)
    if (result.quote) {
      quotes.push(result.quote)
    } else {
      issues.push(result.issue)
    }
  }

  return { fetchedAt: Date.now(), issues, quotes }
}
