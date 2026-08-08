import type { FundHoldingQuote, FundHoldingQuoteRequest } from '../../models/fundHoldingQuote.ts'

const recordPattern = /v_(?:s_)?(hk|sh|sz|us)([A-Za-z0-9][A-Za-z0-9.-]*)="([^"]*)";/g

export function parseTencentFundHoldingQuotesResponse(
  responseText: string,
  requests: readonly FundHoldingQuoteRequest[],
): readonly FundHoldingQuote[] {
  const requested = new Set(requests.map(({ code, market }) => `${market}:${code}`))
  const quotes: FundHoldingQuote[] = []
  const seen = new Set<string>()
  for (const match of responseText.matchAll(recordPattern)) {
    const market = match[1] as 'hk' | 'sh' | 'sz' | 'us'
    const code = match[2]!
    const key = `${market}:${code}`
    if (!requested.has(key) || seen.has(key)) continue
    const fields = match[3]!.split('~')
    if (!matchesQuoteCode(market, code, fields[2])) continue
    const latestPrice = parseNumber(fields[3])
    const dailyChangePercent = parseNumber(
      market === 'sh' || market === 'sz' ? fields[32] : fields[5],
    )
    if (latestPrice === null && dailyChangePercent === null) continue
    seen.add(key)
    quotes.push({ code, dailyChangePercent, latestPrice, market })
  }
  if (quotes.length === 0) throw new Error('腾讯持仓行情服务返回了无效数据')
  return quotes
}

function matchesQuoteCode(
  market: 'hk' | 'sh' | 'sz' | 'us',
  code: string,
  value: string | undefined,
) {
  if (value === undefined) return false
  if (market !== 'us') return value === code
  return value === code || value.startsWith(`${code}.`)
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
