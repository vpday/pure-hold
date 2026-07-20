import type { IndexDefinition } from '../../models/indexDefinition'
import type { IndexQuoteSnapshot } from '../../models/indexQuote'
import type { IndexQuoteIssue } from '../../models/indexQuoteIssue'
import type { EastmoneyIndexQuoteDto } from './eastmoneyIndexQuoteDto'

type EastmoneyQuoteMapResult =
  | { readonly issue: IndexQuoteIssue; readonly quote?: never }
  | { readonly issue?: never; readonly quote: IndexQuoteSnapshot }

export function mapEastmoneyIndexQuote(
  definition: IndexDefinition,
  dto: EastmoneyIndexQuoteDto,
): EastmoneyQuoteMapResult {
  if (dto.securityCode !== definition.securityCode) {
    return issue(definition.id, 'security-code-mismatch')
  }

  const price = toFiniteNumber(dto.price)
  if (price === undefined || price < 0) {
    return issue(definition.id, 'invalid-price')
  }

  const changeAmount = toFiniteNumber(dto.changeAmount)
  if (changeAmount === undefined) {
    return issue(definition.id, 'invalid-change-amount')
  }

  const changePercent = toFiniteNumber(dto.changePercent)
  if (changePercent === undefined) {
    return issue(definition.id, 'invalid-change-percent')
  }

  const quotedAtSeconds = toFiniteNumber(dto.quotedAt)
  if (quotedAtSeconds === undefined || quotedAtSeconds <= 0) {
    return issue(definition.id, 'invalid-quote-time')
  }

  return {
    quote: {
      changeAmount,
      changePercent,
      indexId: definition.id,
      price,
      quotedAt: quotedAtSeconds * 1000,
    },
  }
}

function issue(indexId: string, code: IndexQuoteIssue['code']): EastmoneyQuoteMapResult {
  return { issue: { code, indexId } }
}

function toFiniteNumber(value: unknown): number | undefined {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') {
    return undefined
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
