import type { IndexPerformanceHistory } from '../../models/indexPerformanceHistory.ts'
import { createCsindexPerformanceRequestUrl } from './createCsindexPerformanceRequestUrl.ts'
import { parseCsindexPerformanceResponse } from './parseCsindexPerformanceResponse.ts'

const requestTimeout = 10_000

export async function fetchCsindexPerformanceHistory(
  endDate: string,
  signal: AbortSignal,
): Promise<IndexPerformanceHistory> {
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(requestTimeout)])
  const response = await fetch(createCsindexPerformanceRequestUrl(endDate), {
    signal: requestSignal,
  })
  if (!response.ok) throw new Error('沪深300全收益指数服务暂时不可用')
  return parseCsindexPerformanceResponse(await response.json(), endDate)
}
