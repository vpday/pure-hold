import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory.ts'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import { fetchTiantianFundDistribution } from '@/domains/funds/services/tiantian/fetchTiantianFundDistribution.ts'
import { fetchTiantianFundNetValueHistory } from '@/domains/funds/services/tiantian/fetchTiantianFundNetValueHistory.ts'
import type { LoadFundDistribution } from '../models/fundDistributionTableModel.ts'
import type { LoadFundNetValueHistory } from '../models/fundNetValueChart.ts'
import {
  createAbortError,
  createSharedRequestPool,
  type SharedRequestPool,
} from './createSharedRequestPool.ts'

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

export function useFundHistoryDataSource(
  options: UseFundHistoryDataSourceOptions = {},
): FundHistoryDataSource {
  const loadDistribution = options.loadDistribution ?? fetchTiantianFundDistribution
  const loadNetValueHistory = options.loadNetValueHistory ?? fetchTiantianFundNetValueHistory
  const distributionCache = new Map<string, FundDistributionHistory>()
  const distributionRequests = createSharedRequestPool<string, FundDistributionHistory>()
  const netValueCache = new Map<string, FundNetValueHistory>()
  const netValueRequests = createSharedRequestPool<string, FundNetValueHistory>()
  let disposed = false

  function request<T>(
    key: string,
    cache: Map<string, T>,
    requests: SharedRequestPool<string, T>,
    load: (signal: AbortSignal) => Promise<T>,
    options: FundHistoryLoadOptions,
  ): Promise<T> {
    if (disposed) return Promise.reject(new Error('fund history data source is disposed'))
    if (options.signal?.aborted) return Promise.reject(createAbortError())
    if (!requests.hasPending(key) && !options.force) {
      const cached = cache.get(key)
      if (cached) return Promise.resolve(cached)
    }
    return requests.request(key, options.signal, load).then((value) => {
      cache.set(key, value)
      return value
    })
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
    distributionRequests.dispose()
    netValueRequests.dispose()
    distributionCache.clear()
    netValueCache.clear()
  }

  return {
    dispose,
    loadDistribution: loadDistributionHistory,
    loadNetValueHistory: loadNetValues,
  }
}
