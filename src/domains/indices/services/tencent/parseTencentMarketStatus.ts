const marketStatusPattern = /v_marketStat="([^"]*)";?/

export function parseTencentMarketStatus(responseText: string): ReadonlySet<string> {
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

  if (statuses.size === 0) {
    throw new Error('Tencent market status response has no markets')
  }

  return new Set(
    [...statuses.entries()].filter(([, status]) => status === 'open').map(([code]) => code),
  )
}
