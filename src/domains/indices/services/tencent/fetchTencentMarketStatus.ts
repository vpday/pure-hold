import { parseTencentMarketStatus } from './parseTencentMarketStatus'

const requestTimeout = 10_000
const tencentMarketStatusUrl = 'https://qt.gtimg.cn/?q=marketStat'

export async function fetchTencentMarketStatus(signal: AbortSignal): Promise<ReadonlySet<string>> {
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(requestTimeout)])
  const response = await fetch(tencentMarketStatusUrl, { signal: requestSignal })

  if (!response.ok) {
    throw new Error(`Tencent market status request failed with status ${response.status}`)
  }

  const responseBuffer = await response.arrayBuffer()
  const responseText = new TextDecoder('gbk', { fatal: true }).decode(responseBuffer)
  return parseTencentMarketStatus(responseText)
}
