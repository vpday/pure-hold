import type { FundHoldingQuote, FundHoldingQuoteRequest } from '../../models/fundHoldingQuote.ts'

const recordPattern = /v_(sh|sz)(\d{6})="([^"]*)";/g

export function parseTencentFundHoldingQuotesResponse(
  responseText: string,
  requests: readonly FundHoldingQuoteRequest[],
): readonly FundHoldingQuote[] {
  const requested = new Set(requests.map(({ code, market }) => `${market}:${code}`))
  const quotes: FundHoldingQuote[] = []
  const seen = new Set<string>()
  for (const match of responseText.matchAll(recordPattern)) {
    const market = match[1] as 'sh' | 'sz'
    const code = match[2]!
    const key = `${market}:${code}`
    if (!requested.has(key) || seen.has(key)) continue
    const fields = match[3]!.split('~')
    if (fields[2] !== code) continue
    const latestPrice = parseNumber(fields[3])
    const dailyChangePercent = parseNumber(fields[32])
    if (latestPrice === null && dailyChangePercent === null) continue
    seen.add(key)
    quotes.push({ code, dailyChangePercent, latestPrice, market })
  }
  if (quotes.length === 0) throw new Error('腾讯持仓行情服务返回了无效数据')
  return quotes
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
