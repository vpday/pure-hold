import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import { calculateFundReinvestedNav } from '@/domains/funds/models/fundReinvestedNav.ts'
import type { FundReinvestedNavIssueCode } from '@/domains/funds/models/fundReinvestedNav.ts'
import type { FundMetricsView } from '../models/fundMetricsSectionModel.ts'
import {
  calculateFundMetricsComparison,
  type FundMetricsComparison,
} from '../models/fundMetricsComparison.ts'
import { toFundMetricsSectionModel } from '../presenters/toFundMetricsSectionModel.ts'
import type { FundBenchmarkDataSource } from './useFundBenchmarkDataSource.ts'
import type { FundHistoryDataSource } from './useFundHistoryDataSource.ts'

export type FundMetricsNotice =
  | {
      readonly batchId: number
      readonly kind: 'benchmark-history-incomplete'
    }
  | {
      readonly batchId: number
      readonly kind: 'cached-refresh-failed'
    }
  | {
      readonly batchId: number
      readonly counts: Readonly<Partial<Record<FundReinvestedNavIssueCode, number>>>
      readonly kind: 'reinvested-nav-issues'
      readonly totalCount: number
    }

interface BenchmarkLoadFailure {
  readonly cause: unknown
  readonly source: 'benchmark'
}

export function useFundMetrics(
  dataSource: FundHistoryDataSource,
  benchmarkDataSource: FundBenchmarkDataSource,
) {
  const activeView = ref<FundMetricsView>('periods')
  const currentFundCode = ref<string>()
  const data = shallowRef<FundMetricsComparison>()
  const error = ref('')
  const isActivated = ref(false)
  const isLoading = ref(false)
  const model = computed(() => (data.value ? toFundMetricsSectionModel(data.value) : undefined))
  let nextBatchId = 0
  let pendingNotices: FundMetricsNotice[] = []
  let requestGeneration = 0
  let activeRequest:
    | {
        readonly controller: AbortController
        readonly generation: number
        readonly promise: Promise<void>
      }
    | undefined

  function open(fundCode: string): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = fundCode
    activeView.value = 'periods'
    data.value = undefined
    error.value = ''
    isActivated.value = false
    isLoading.value = false
    pendingNotices = []
  }

  async function activate(): Promise<void> {
    if (isActivated.value) return
    isActivated.value = true
    await request(false)
  }

  async function retry(): Promise<void> {
    if (!isActivated.value) return
    await request(true)
  }

  async function refresh(): Promise<void> {
    if (!isActivated.value) return
    await request(true)
  }

  function selectView(view: FundMetricsView): void {
    activeView.value = view
  }

  function takeNotice(): FundMetricsNotice | undefined {
    return pendingNotices.shift()
  }

  function close(): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = undefined
    activeView.value = 'periods'
    data.value = undefined
    error.value = ''
    isActivated.value = false
    isLoading.value = false
    pendingNotices = []
  }

  async function request(force: boolean): Promise<void> {
    const fundCode = currentFundCode.value
    if (!fundCode) return
    if (activeRequest) return await activeRequest.promise

    const controller = new AbortController()
    const generation = ++requestGeneration
    const batchId = ++nextBatchId
    const promise = loadBatch(fundCode, force, controller.signal, generation, batchId)
    activeRequest = { controller, generation, promise }
    isLoading.value = true
    error.value = ''
    await promise
  }

  async function loadBatch(
    fundCode: string,
    force: boolean,
    signal: AbortSignal,
    generation: number,
    batchId: number,
  ): Promise<void> {
    try {
      const [netValues, distribution, benchmark] = await Promise.all([
        dataSource.loadNetValueHistory(fundCode, 'ln', { force, signal }),
        dataSource.loadDistribution(fundCode, { force, signal }),
        benchmarkDataSource.load({ force, signal }).catch((cause: unknown) => {
          throw { cause, source: 'benchmark' } satisfies BenchmarkLoadFailure
        }),
      ])
      if (!isCurrent(fundCode, generation)) return
      const reinvested = calculateFundReinvestedNav(netValues, distribution)
      data.value = calculateFundMetricsComparison(reinvested.points, benchmark.points)
      error.value = ''
      pendingNotices = noticesForSuccessfulBatch(
        batchId,
        reinvested.issues,
        benchmark.issues.length > 0,
      )
    } catch (requestError) {
      if (isCurrent(fundCode, generation) && !isAbortError(requestError)) {
        if (force && data.value && isBenchmarkLoadFailure(requestError)) {
          pendingNotices = [{ batchId, kind: 'cached-refresh-failed' }]
        } else {
          error.value = '基金数据指标加载失败，请稍后重试'
        }
      }
    } finally {
      if (isCurrent(fundCode, generation)) {
        isLoading.value = false
        activeRequest = undefined
      }
    }
  }

  function isCurrent(fundCode: string, generation: number): boolean {
    return currentFundCode.value === fundCode && requestGeneration === generation
  }

  function cancelActiveRequest(): void {
    activeRequest?.controller.abort()
    activeRequest = undefined
  }

  if (getCurrentScope()) onScopeDispose(close)

  return {
    activate,
    activeView,
    close,
    currentFundCode,
    data,
    error,
    isActivated,
    isLoading,
    model,
    open,
    refresh,
    retry,
    selectView,
    takeNotice,
  }
}

function noticesForSuccessfulBatch(
  batchId: number,
  issues: readonly { readonly code: FundReinvestedNavIssueCode; readonly count: number }[],
  benchmarkHistoryIncomplete: boolean,
): FundMetricsNotice[] {
  const notices: FundMetricsNotice[] = []
  if (issues.length > 0) {
    const counts: Partial<Record<FundReinvestedNavIssueCode, number>> = {}
    let totalCount = 0
    for (const issue of issues) {
      counts[issue.code] = (counts[issue.code] ?? 0) + issue.count
      totalCount += issue.count
    }
    notices.push({ batchId, counts, kind: 'reinvested-nav-issues', totalCount })
  }
  if (benchmarkHistoryIncomplete) {
    notices.push({ batchId, kind: 'benchmark-history-incomplete' })
  }
  return notices
}

function isBenchmarkLoadFailure(error: unknown): error is BenchmarkLoadFailure {
  return (
    typeof error === 'object' && error !== null && 'source' in error && error.source === 'benchmark'
  )
}

function isAbortError(error: unknown): boolean {
  if (isBenchmarkLoadFailure(error)) return isAbortError(error.cause)
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
