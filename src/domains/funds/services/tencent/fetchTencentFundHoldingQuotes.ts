import type { FundHoldingQuote, FundHoldingQuoteRequest } from '../../models/fundHoldingQuote.ts'
import { createTencentFundHoldingQuotesRequestUrl } from './createTencentFundHoldingQuotesRequestUrl.ts'
import { parseTencentFundHoldingQuotesResponse } from './parseTencentFundHoldingQuotesResponse.ts'

const requestTimeout = 10_000

export async function fetchTencentFundHoldingQuotes(
  requests: readonly FundHoldingQuoteRequest[],
  signal?: AbortSignal,
): Promise<readonly FundHoldingQuote[]> {
  const timeoutSignal = AbortSignal.timeout(requestTimeout)
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
  const response = await fetch(createTencentFundHoldingQuotesRequestUrl(requests), {
    signal: requestSignal,
  })
  if (!response.ok) {
    throw new Error(`Tencent fund holding quotes request failed with HTTP ${response.status}`)
  }
  const responseBuffer = await response.arrayBuffer()
  const responseText = new TextDecoder('gbk', { fatal: true }).decode(responseBuffer)
  return parseTencentFundHoldingQuotesResponse(responseText, requests)
}
