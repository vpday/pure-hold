import { parseTencentMarketStatus } from './parseTencentMarketStatus'

const requestTimeout = 10_000
const tencentMarketStatusEndpoint = 'https://qt.gtimg.cn/'

export async function fetchTencentMarketStatus(signal: AbortSignal): Promise<ReadonlySet<string>> {
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(requestTimeout)])
  const url = new URL(tencentMarketStatusEndpoint)
  url.searchParams.set('q', 'marketStat')
  url.searchParams.set('_', Date.now().toString())
  const response = await fetch(url, { signal: requestSignal })

  if (!response.ok) {
    throw new Error(`Tencent market status request failed with status ${response.status}`)
  }

  const responseBuffer = await response.arrayBuffer()
  const responseText = new TextDecoder('gbk', { fatal: true }).decode(responseBuffer)
  return parseTencentMarketStatus(responseText)
}
