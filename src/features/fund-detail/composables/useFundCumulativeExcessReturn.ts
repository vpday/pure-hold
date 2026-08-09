import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import {
  calculateFundReinvestedNav,
  type FundReinvestedNavResult,
} from '@/domains/funds/models/fundReinvestedNav.ts'
import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import { defaultFundHistoryRange } from '../config/fundHistoryRangeOptions.ts'
import {
  calculateFundCumulativeExcessReturn,
  type FundCumulativeExcessReturnResult,
} from '../models/fundCumulativeExcessReturn.ts'
import type { FundBenchmarkDataSource } from './useFundBenchmarkDataSource.ts'
import type { FundHistoryDataSource } from './useFundHistoryDataSource.ts'

interface SuccessfulInputs {
  readonly benchmark: IndexPerformanceHistory
  readonly fund: FundReinvestedNavResult
}

export function useFundCumulativeExcessReturn(
  historyDataSource: FundHistoryDataSource,
  benchmarkDataSource: FundBenchmarkDataSource,
) {
  const currentFundCode = ref<string>()
  const data = shallowRef<FundCumulativeExcessReturnResult>()
  const error = ref('')
  const isLoading = ref(false)
  const selectedRange = ref<FundHistoryRange>(defaultFundHistoryRange)
  const warning = ref('')
  let active = false
  let lastSuccessfulInputs: SuccessfulInputs | undefined
  let requestGeneration = 0
  let activeRequest:
    | {
        readonly controller: AbortController
        readonly fundCode: string
        readonly generation: number
        readonly promise: Promise<SuccessfulInputs>
      }
    | undefined

  function initialize(fundCode: string): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = fundCode
    active = false
    resetState()
  }

  async function activate(): Promise<void> {
    if (active) return
    active = true
    await request(false)
  }

  function selectRange(range: FundHistoryRange): void {
    selectedRange.value = range
    if (lastSuccessfulInputs) applyInputs(lastSuccessfulInputs)
  }

  async function retry(): Promise<void> {
    if (active) await request(true)
  }

  async function refresh(): Promise<void> {
    if (active) await request(true)
  }

  function close(): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = undefined
    active = false
    resetState()
  }

  async function request(force: boolean): Promise<void> {
    const fundCode = currentFundCode.value
    if (!fundCode) return
    const pending =
      activeRequest?.fundCode === fundCode ? activeRequest : startRequest(fundCode, force)
    isLoading.value = true
    error.value = ''
    try {
      const inputs = await pending.promise
      if (!isCurrentRequest(fundCode, pending.generation)) return
      lastSuccessfulInputs = inputs
      applyInputs(inputs)
    } catch (requestError) {
      if (!isCurrentRequest(fundCode, pending.generation) || isAbortError(requestError)) return
      if (data.value) {
        warning.value = '刷新失败，当前展示旧数据'
      } else {
        error.value = '累计超额加载失败，请稍后重试'
      }
    } finally {
      if (isCurrentRequest(fundCode, pending.generation)) isLoading.value = false
    }
  }

  function startRequest(fundCode: string, force: boolean): NonNullable<typeof activeRequest> {
    const controller = new AbortController()
    const generation = ++requestGeneration
    const options = { force, signal: controller.signal }
    const promise = Promise.all([
      historyDataSource.loadNetValueHistory(fundCode, 'ln', options),
      historyDataSource.loadDistribution(fundCode, options),
      benchmarkDataSource.load(options),
    ]).then(([netValues, distribution, benchmark]) => ({
      benchmark,
      fund: calculateFundReinvestedNav(netValues, distribution),
    }))
    const pending = { controller, fundCode, generation, promise }
    activeRequest = pending
    const clearRequest = () => {
      if (activeRequest?.generation === generation) activeRequest = undefined
    }
    void promise.then(clearRequest, clearRequest)
    return pending
  }

  function applyInputs(inputs: SuccessfulInputs): void {
    const result = calculateFundCumulativeExcessReturn(
      inputs.fund,
      inputs.benchmark,
      selectedRange.value,
    )
    data.value = result
    error.value = ''
    warning.value =
      result.sourceIssues.fund.length || result.sourceIssues.benchmark.length
        ? '部分基金净值、分红折算或基准历史数据异常，已忽略异常记录'
        : ''
  }

  function isCurrentRequest(fundCode: string, generation: number): boolean {
    return currentFundCode.value === fundCode && active && requestGeneration === generation
  }

  function resetState(): void {
    data.value = undefined
    error.value = ''
    isLoading.value = false
    lastSuccessfulInputs = undefined
    selectedRange.value = defaultFundHistoryRange
    warning.value = ''
  }

  function cancelActiveRequest(): void {
    activeRequest?.controller.abort()
    activeRequest = undefined
  }

  if (getCurrentScope()) onScopeDispose(close)

  return {
    activate,
    close,
    currentFundCode,
    data,
    error,
    initialize,
    isLoading,
    refresh,
    retry,
    selectedRange,
    selectRange,
    warning,
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
