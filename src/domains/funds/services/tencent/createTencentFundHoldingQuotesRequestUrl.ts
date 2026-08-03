import type { FundHoldingQuoteRequest } from '../../models/fundHoldingQuote.ts'

const endpoint = 'https://qt.gtimg.cn/'

export function createTencentFundHoldingQuotesRequestUrl(
  requests: readonly FundHoldingQuoteRequest[],
): URL {
  if (requests.length === 0) throw new Error('at least one fund holding quote is required')
  const seen = new Set<string>()
  const symbols: string[] = []
  for (const request of requests) {
    if ((request.market !== 'sh' && request.market !== 'sz') || !/^\d{6}$/.test(request.code)) {
      throw new Error('fund holding quote request is invalid')
    }
    const symbol = `${request.market}${request.code}`
    if (!seen.has(symbol)) {
      seen.add(symbol)
      symbols.push(symbol)
    }
  }
  const url = new URL(endpoint)
  url.searchParams.set('q', symbols.join(','))
  return url
}
