import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import { defaultFundHistoryRange } from '../config/fundHistoryRangeOptions.ts'
import type { LoadFundNetValueHistory } from '../models/fundNetValueChart.ts'
import { type FundHistoryDataSource, useFundHistoryDataSource } from './useFundHistoryDataSource.ts'

export function useFundNetValueHistory(source?: FundHistoryDataSource | LoadFundNetValueHistory) {
  const ownsDataSource = !source || typeof source === 'function'
  const dataSource =
    typeof source === 'object' ? source : useFundHistoryDataSource({ loadNetValueHistory: source })
  const currentFundCode = ref<string>()
  const selectedRange = ref<FundHistoryRange>(defaultFundHistoryRange)
  const data = shallowRef<FundNetValueHistory>()
  const isLoading = ref(false)
  const error = ref('')
  let active = false
  let activeRequest:
    | {
        readonly controller: AbortController
        readonly generation: number
        readonly key: string
        readonly promise: Promise<FundNetValueHistory>
      }
    | undefined
  let requestGeneration = 0

  function initialize(fundCode: string): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = fundCode
    active = false
    resetState()
  }

  async function activate(): Promise<void> {
    active = true
    await request(false)
  }

  async function selectRange(range: FundHistoryRange): Promise<void> {
    if (selectedRange.value === range) return
    selectedRange.value = range
    error.value = ''
    if (active) await request(false)
  }

  async function retry(): Promise<void> {
    if (!active) return
    await request(true)
  }

  async function refresh(): Promise<void> {
    if (!active) return
    await request(true)
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
    const range = selectedRange.value
    const key = cacheKey(fundCode, range)
    if (activeRequest && activeRequest.key !== key) {
      cancelActiveRequest()
      isLoading.value = false
    }
    const request =
      activeRequest?.key === key ? activeRequest : startRequest(fundCode, range, key, force)
    isLoading.value = true
    error.value = ''
    try {
      const result = await request.promise
      if (isCurrentTarget(fundCode, range)) applyResult(result)
    } catch (requestError) {
      if (isCurrentTarget(fundCode, range) && !isAbortError(requestError)) {
        error.value = '基金净值历史加载失败，请稍后重试'
      }
    } finally {
      if (isCurrentTarget(fundCode, range)) isLoading.value = false
    }
  }

  function startRequest(
    fundCode: string,
    range: FundHistoryRange,
    key: string,
    force: boolean,
  ): NonNullable<typeof activeRequest> {
    const controller = new AbortController()
    const generation = ++requestGeneration
    const promise = dataSource.loadNetValueHistory(fundCode, range, {
      force,
      signal: controller.signal,
    })
    const request = { controller, generation, key, promise }
    activeRequest = request
    const clearRequest = () => {
      if (activeRequest?.generation === generation) {
        activeRequest = undefined
      }
    }
    void promise.then(clearRequest, clearRequest)
    return request
  }

  function applyResult(result: FundNetValueHistory): void {
    data.value = result
    error.value = ''
    isLoading.value = false
  }

  function isCurrentTarget(fundCode: string, range: FundHistoryRange): boolean {
    return currentFundCode.value === fundCode && active && selectedRange.value === range
  }

  function resetState(): void {
    selectedRange.value = defaultFundHistoryRange
    data.value = undefined
    isLoading.value = false
    error.value = ''
  }

  function cancelActiveRequest(): void {
    activeRequest?.controller.abort()
    activeRequest = undefined
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      close()
      if (ownsDataSource) dataSource.dispose()
    })
  }

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
  }
}

function cacheKey(fundCode: string, range: FundHistoryRange): string {
  return `${fundCode}:${range}`
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
