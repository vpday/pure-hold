import type { IndexMarket } from '../../models/indexDefinition'

const marketStatusPattern = /v_marketStat="([^"]*)";?/

export function parseTencentMarketStatus(responseText: string): ReadonlySet<IndexMarket> {
  const match = marketStatusPattern.exec(responseText)
  const fields = match?.[1]?.split('|')
  if (!fields || fields.length < 2) {
    throw new Error('Tencent market status response is malformed')
  }

  const statuses = new Map<string, string>()
  for (const field of fields.slice(1)) {
    const statusMatch = /^([A-Z]+)_([a-z]+)_/.exec(field)
    if (statusMatch?.[1] && statusMatch[2]) {
      statuses.set(statusMatch[1], statusMatch[2])
    }
  }

  if (
    ![...statuses.keys()].some(
      (code) => code === 'SH' || code === 'SZ' || code === 'HK' || code === 'US',
    )
  ) {
    throw new Error('Tencent market status response has no primary markets')
  }

  const openMarkets = new Set<IndexMarket>()
  if (statuses.get('SH') === 'open' || statuses.get('SZ') === 'open') {
    openMarkets.add('cn')
  }
  if (statuses.get('HK') === 'open') {
    openMarkets.add('hk')
  }
  if (statuses.get('US') === 'open') {
    openMarkets.add('us')
  }

  return openMarkets
}
