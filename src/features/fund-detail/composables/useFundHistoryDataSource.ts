import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory.ts'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import { fetchTiantianFundDistribution } from '@/domains/funds/services/tiantian/fetchTiantianFundDistribution.ts'
import { fetchTiantianFundNetValueHistory } from '@/domains/funds/services/tiantian/fetchTiantianFundNetValueHistory.ts'
import type { LoadFundDistribution } from '../models/fundDistributionTableModel.ts'
import type { LoadFundNetValueHistory } from '../models/fundNetValueChart.ts'

export interface FundHistoryLoadOptions {
  readonly force?: boolean
  readonly signal?: AbortSignal
}

export interface FundHistoryDataSource {
  dispose(): void
  loadDistribution(
    fundCode: string,
    options?: FundHistoryLoadOptions,
  ): Promise<FundDistributionHistory>
  loadNetValueHistory(
    fundCode: string,
    range: FundHistoryRange,
    options?: FundHistoryLoadOptions,
  ): Promise<FundNetValueHistory>
}

interface UseFundHistoryDataSourceOptions {
  readonly loadDistribution?: LoadFundDistribution
  readonly loadNetValueHistory?: LoadFundNetValueHistory
}

interface PendingRequest<T> {
  readonly controller: AbortController
  readonly promise: Promise<T>
  readonly subscribers: Set<symbol>
}

export function useFundHistoryDataSource(
  options: UseFundHistoryDataSourceOptions = {},
): FundHistoryDataSource {
  const loadDistribution = options.loadDistribution ?? fetchTiantianFundDistribution
  const loadNetValueHistory = options.loadNetValueHistory ?? fetchTiantianFundNetValueHistory
  const distributionCache = new Map<string, FundDistributionHistory>()
  const distributionRequests = new Map<string, PendingRequest<FundDistributionHistory>>()
  const netValueCache = new Map<string, FundNetValueHistory>()
  const netValueRequests = new Map<string, PendingRequest<FundNetValueHistory>>()
  let disposed = false

  function request<T>(
    key: string,
    cache: Map<string, T>,
    requests: Map<string, PendingRequest<T>>,
    load: (signal: AbortSignal) => Promise<T>,
    options: FundHistoryLoadOptions,
  ): Promise<T> {
    if (disposed) return Promise.reject(new Error('fund history data source is disposed'))
    if (options.signal?.aborted) return Promise.reject(abortError())
    const pending = requests.get(key)
    if (pending) return subscribe(key, pending, requests, options.signal)
    if (!options.force) {
      const cached = cache.get(key)
      if (cached)
        return options.signal?.aborted ? Promise.reject(abortError()) : Promise.resolve(cached)
    }

    const controller = new AbortController()
    const next: PendingRequest<T> = {
      controller,
      promise: load(controller.signal),
      subscribers: new Set(),
    }
    requests.set(key, next)
    void next.promise.then(
      (value) => {
        if (requests.get(key) === next) cache.set(key, value)
        clearRequest(key, next, requests)
      },
      () => clearRequest(key, next, requests),
    )
    return subscribe(key, next, requests, options.signal)
  }

  function loadDistributionHistory(
    fundCode: string,
    options: FundHistoryLoadOptions = {},
  ): Promise<FundDistributionHistory> {
    return request(
      fundCode,
      distributionCache,
      distributionRequests,
      (signal) => loadDistribution(fundCode, signal),
      options,
    )
  }

  function loadNetValues(
    fundCode: string,
    range: FundHistoryRange,
    options: FundHistoryLoadOptions = {},
  ): Promise<FundNetValueHistory> {
    const key = `${fundCode}:${range}`
    return request(
      key,
      netValueCache,
      netValueRequests,
      (signal) => loadNetValueHistory(fundCode, range, signal),
      options,
    )
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    for (const pending of [...distributionRequests.values(), ...netValueRequests.values()]) {
      pending.controller.abort()
    }
    distributionRequests.clear()
    netValueRequests.clear()
    distributionCache.clear()
    netValueCache.clear()
  }

  return {
    dispose,
    loadDistribution: loadDistributionHistory,
    loadNetValueHistory: loadNetValues,
  }
}

function subscribe<T>(
  key: string,
  pending: PendingRequest<T>,
  requests: Map<string, PendingRequest<T>>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError())
  const subscriber = Symbol(key)
  pending.subscribers.add(subscriber)
  return new Promise<T>((resolve, reject) => {
    const cancel = () => {
      cleanup()
      reject(abortError())
      if (pending.subscribers.size === 0 && requests.get(key) === pending) {
        requests.delete(key)
        pending.controller.abort()
      }
    }
    const cleanup = () => {
      signal?.removeEventListener('abort', cancel)
      pending.subscribers.delete(subscriber)
    }
    signal?.addEventListener('abort', cancel, { once: true })
    void pending.promise.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error: unknown) => {
        cleanup()
        reject(error)
      },
    )
  })
}

function clearRequest<T>(
  key: string,
  pending: PendingRequest<T>,
  requests: Map<string, PendingRequest<T>>,
): void {
  if (requests.get(key) === pending) requests.delete(key)
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError')
}
