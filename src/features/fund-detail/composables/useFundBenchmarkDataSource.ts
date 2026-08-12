import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { fetchCsindexPerformanceHistory } from '@/domains/indices/services/csindex/fetchCsindexPerformanceHistory.ts'
import { formatShanghaiDate } from '@/domains/indices/services/csindex/createCsindexPerformanceRequestUrl.ts'
import { createAbortError, createSharedRequestPool } from './createSharedRequestPool.ts'

export type LoadFundBenchmarkHistory = (
  endDate: string,
  signal: AbortSignal,
) => Promise<IndexPerformanceHistory>

export interface FundBenchmarkLoadOptions {
  readonly force?: boolean
  readonly signal?: AbortSignal
}

export interface FundBenchmarkDataSource {
  dispose(): void
  load(options?: FundBenchmarkLoadOptions): Promise<IndexPerformanceHistory>
}

interface UseFundBenchmarkDataSourceOptions {
  readonly load?: LoadFundBenchmarkHistory
  readonly now?: () => Date
}

export function useFundBenchmarkDataSource(
  options: UseFundBenchmarkDataSourceOptions = {},
): FundBenchmarkDataSource {
  const loadHistory = options.load ?? fetchCsindexPerformanceHistory
  const now = options.now ?? (() => new Date())
  const requests = createSharedRequestPool<string, IndexPerformanceHistory>()
  let cache: IndexPerformanceHistory | undefined
  let disposed = false
  let requestDate: string | undefined

  function load(loadOptions: FundBenchmarkLoadOptions = {}): Promise<IndexPerformanceHistory> {
    if (disposed) return Promise.reject(new Error('fund benchmark data source is disposed'))
    if (loadOptions.signal?.aborted) return Promise.reject(createAbortError())
    const endDate = formatShanghaiDate(now())
    if (requestDate && requestDate !== endDate) {
      requests.abortPending()
    }
    requestDate = endDate
    if (!requests.hasPending(endDate) && !loadOptions.force && cache?.endDate === endDate) {
      return Promise.resolve(cache)
    }
    return requests
      .request(endDate, loadOptions.signal, (signal) => loadHistory(endDate, signal))
      .then((history) => {
        if (requestDate === endDate) cache = history
        return history
      })
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    requests.dispose()
    cache = undefined
  }

  return { dispose, load }
}
