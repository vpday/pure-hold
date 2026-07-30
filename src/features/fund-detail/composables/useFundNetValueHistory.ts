import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory.ts'
import { fetchTiantianFundNetValueHistory } from '@/domains/funds/services/tiantian/fetchTiantianFundNetValueHistory.ts'
import { defaultFundHistoryRange } from '../config/fundHistoryRangeOptions.ts'
import type { FundNetValueView, LoadFundNetValueHistory } from '../models/fundNetValueChart.ts'

const views = ['unit-net-value', 'cumulative-net-value'] as const

export function useFundNetValueHistory(
  load: LoadFundNetValueHistory = fetchTiantianFundNetValueHistory,
) {
  const currentFundCode = ref<string>()
  const activeView = ref<FundNetValueView>()
  const selectedRanges = {
    'cumulative-net-value': ref<FundHistoryRange>(defaultFundHistoryRange),
    'unit-net-value': ref<FundHistoryRange>(defaultFundHistoryRange),
  }
  const data = {
    'cumulative-net-value': shallowRef<FundNetValueHistory>(),
    'unit-net-value': shallowRef<FundNetValueHistory>(),
  }
  const isLoading = {
    'cumulative-net-value': ref(false),
    'unit-net-value': ref(false),
  }
  const error = {
    'cumulative-net-value': ref(''),
    'unit-net-value': ref(''),
  }
  const cache = new Map<string, FundNetValueHistory>()

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
    activeView.value = undefined
    resetViewState()
  }

  async function activate(view: FundNetValueView): Promise<void> {
    activeView.value = view
    await request(view, false)
  }

  async function selectRange(view: FundNetValueView, range: FundHistoryRange): Promise<void> {
    if (selectedRanges[view].value === range) return
    selectedRanges[view].value = range
    error[view].value = ''
    if (activeView.value === view) {
      await request(view, false)
    }
  }

  async function retry(view: FundNetValueView): Promise<void> {
    if (activeView.value !== view) return
    await request(view, true)
  }

  async function refresh(view: FundNetValueView): Promise<void> {
    if (activeView.value !== view) return
    await request(view, true)
  }

  function close(): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = undefined
    activeView.value = undefined
    resetViewState()
  }

  async function request(view: FundNetValueView, force: boolean): Promise<void> {
    const fundCode = currentFundCode.value
    if (!fundCode) return
    const range = selectedRanges[view].value
    const key = cacheKey(fundCode, range)
    if (activeRequest && activeRequest.key !== key) {
      cancelActiveRequest()
      clearLoading()
    }
    if (!activeRequest && !force) {
      const cached = cache.get(key)
      if (cached) {
        applyResult(view, cached)
        return
      }
    }

    const request = activeRequest?.key === key ? activeRequest : startRequest(fundCode, range, key)
    isLoading[view].value = true
    error[view].value = ''
    try {
      const result = await request.promise
      if (isCurrentTarget(view, fundCode, range)) {
        applyResult(view, result)
      }
    } catch (requestError) {
      if (isCurrentTarget(view, fundCode, range) && !isAbortError(requestError)) {
        error[view].value = '基金净值历史加载失败，请稍后重试'
      }
    } finally {
      if (isCurrentTarget(view, fundCode, range)) {
        isLoading[view].value = false
      }
    }
  }

  function startRequest(
    fundCode: string,
    range: FundHistoryRange,
    key: string,
  ): NonNullable<typeof activeRequest> {
    const controller = new AbortController()
    const generation = ++requestGeneration
    const promise = load(fundCode, range, controller.signal).then((result) => {
      if (generation === requestGeneration && currentFundCode.value === fundCode) {
        cache.set(key, result)
      }
      return result
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

  function applyResult(view: FundNetValueView, result: FundNetValueHistory): void {
    data[view].value = result
    error[view].value = ''
    isLoading[view].value = false
  }

  function isCurrentTarget(
    view: FundNetValueView,
    fundCode: string,
    range: FundHistoryRange,
  ): boolean {
    return (
      currentFundCode.value === fundCode &&
      activeView.value === view &&
      selectedRanges[view].value === range
    )
  }

  function resetViewState(): void {
    for (const view of views) {
      selectedRanges[view].value = defaultFundHistoryRange
      data[view].value = undefined
      isLoading[view].value = false
      error[view].value = ''
    }
  }

  function clearLoading(): void {
    for (const view of views) {
      isLoading[view].value = false
    }
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
    initialize,
    isLoading,
    refresh,
    retry,
    selectedRanges,
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
