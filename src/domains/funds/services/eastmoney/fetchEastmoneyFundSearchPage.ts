import type { FundSearchPage } from '../../models/fundSearch.ts'
import { createEastmoneyFundSearchRequestUrl } from './createEastmoneyFundSearchRequestUrl.ts'
import { parseEastmoneyFundSearchResponse } from './parseEastmoneyFundSearchResponse.ts'

const requestTimeoutMs = 10_000

export async function fetchEastmoneyFundSearchPage(
  query: string,
  pageIndex: number,
  signal?: AbortSignal,
): Promise<FundSearchPage> {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const response = await fetch(createEastmoneyFundSearchRequestUrl(query, pageIndex), {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error('基金搜索服务暂时不可用')
    }
    return parseEastmoneyFundSearchResponse(await response.json(), pageIndex)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
