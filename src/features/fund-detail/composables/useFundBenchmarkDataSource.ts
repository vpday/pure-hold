import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { fetchCsindexPerformanceHistory } from '@/domains/indices/services/csindex/fetchCsindexPerformanceHistory.ts'
import { formatShanghaiDate } from '@/domains/indices/services/csindex/createCsindexPerformanceRequestUrl.ts'

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

interface PendingRequest {
  readonly controller: AbortController
  readonly endDate: string
  readonly promise: Promise<IndexPerformanceHistory>
  readonly subscribers: Set<symbol>
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
  let cache: IndexPerformanceHistory | undefined
  let disposed = false
  let pending: PendingRequest | undefined

  function load(loadOptions: FundBenchmarkLoadOptions = {}): Promise<IndexPerformanceHistory> {
    if (disposed) return Promise.reject(new Error('fund benchmark data source is disposed'))
    if (loadOptions.signal?.aborted) return Promise.reject(abortError())
    const endDate = formatShanghaiDate(now())
    if (pending && pending.endDate !== endDate) {
      pending.controller.abort()
      pending = undefined
    }
    if (pending) return subscribe(pending, loadOptions.signal)
    if (cache?.endDate === endDate) return Promise.resolve(cache)

    const controller = new AbortController()
    const next: PendingRequest = {
      controller,
      endDate,
      promise: loadHistory(endDate, controller.signal),
      subscribers: new Set(),
    }
    pending = next
    void next.promise.then(
      (history) => {
        if (pending === next) cache = history
        clearPending(next)
      },
      () => clearPending(next),
    )
    return subscribe(next, loadOptions.signal)
  }

  function subscribe(
    request: PendingRequest,
    signal?: AbortSignal,
  ): Promise<IndexPerformanceHistory> {
    const subscriber = Symbol('fund-benchmark')
    request.subscribers.add(subscriber)
    return new Promise((resolve, reject) => {
      const cancel = () => {
        cleanup()
        reject(abortError())
        if (request.subscribers.size === 0 && pending === request) {
          pending = undefined
          request.controller.abort()
        }
      }
      const cleanup = () => {
        signal?.removeEventListener('abort', cancel)
        request.subscribers.delete(subscriber)
      }
      signal?.addEventListener('abort', cancel, { once: true })
      void request.promise.then(
        (history) => {
          cleanup()
          resolve(history)
        },
        (error: unknown) => {
          cleanup()
          reject(error)
        },
      )
    })
  }

  function clearPending(request: PendingRequest): void {
    if (pending === request) pending = undefined
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    pending?.controller.abort()
    pending = undefined
    cache = undefined
  }

  return { dispose, load }
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError')
}
