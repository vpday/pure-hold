import type { FundHoldingQuoteRequest } from '../../models/fundHoldingQuote.ts'

const endpoint = 'https://qt.gtimg.cn/'

export function createTencentFundHoldingQuotesRequestUrl(
  requests: readonly FundHoldingQuoteRequest[],
): URL {
  if (requests.length === 0) throw new Error('at least one fund holding quote is required')
  const seen = new Set<string>()
  const symbols: string[] = []
  for (const request of requests) {
    if (!isMarket(request.market) || !isQuoteCode(request.code)) {
      throw new Error('fund holding quote request is invalid')
    }
    const symbol =
      request.market === 'hk' || request.market === 'us'
        ? `s_${request.market}${request.code}`
        : `${request.market}${request.code}`
    if (!seen.has(symbol)) {
      seen.add(symbol)
      symbols.push(symbol)
    }
  }
  const url = new URL(endpoint)
  url.searchParams.set('q', symbols.join(','))
  url.searchParams.set('_', Date.now().toString())
  return url
}

function isMarket(value: string): boolean {
  return value === 'hk' || value === 'sh' || value === 'sz' || value === 'us'
}

function isQuoteCode(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(value)
}
