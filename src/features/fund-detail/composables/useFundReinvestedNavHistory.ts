import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import {
  calculateFundReinvestedNav,
  type FundReinvestedNavResult,
} from '@/domains/funds/models/fundReinvestedNav.ts'
import { defaultFundHistoryRange } from '../config/fundHistoryRangeOptions.ts'
import { selectFundReinvestedNavRange } from '../models/fundReinvestedNavRange.ts'
import type { FundHistoryDataSource } from './useFundHistoryDataSource.ts'

export function useFundReinvestedNavHistory(dataSource: FundHistoryDataSource) {
  const currentFundCode = ref<string>()
  const selectedRange = ref<FundHistoryRange>(defaultFundHistoryRange)
  const data = shallowRef<FundReinvestedNavResult>()
  const isLoading = ref(false)
  const error = ref('')
  let active = false
  let activeRequest:
    | {
        readonly controller: AbortController
        readonly fundCode: string
        readonly generation: number
        readonly promise: Promise<FundReinvestedNavResult>
      }
    | undefined
  let requestGeneration = 0

  const selectedData = computed(() =>
    data.value ? selectFundReinvestedNavRange(data.value, selectedRange.value) : undefined,
  )

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

  function selectRange(range: FundHistoryRange): void {
    selectedRange.value = range
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
      const result = await pending.promise
      if (isCurrentRequest(fundCode, pending.generation)) {
        data.value = result
        error.value = ''
      }
    } catch (requestError) {
      if (isCurrentRequest(fundCode, pending.generation) && !isAbortError(requestError)) {
        error.value = '基金复权净值历史加载失败，请稍后重试'
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
      dataSource.loadNetValueHistory(fundCode, 'ln', options),
      dataSource.loadDistribution(fundCode, options),
    ]).then(([netValues, distribution]) => calculateFundReinvestedNav(netValues, distribution))
    const pending = { controller, fundCode, generation, promise }
    activeRequest = pending
    const clearRequest = () => {
      if (activeRequest?.generation === generation) activeRequest = undefined
    }
    void promise.then(clearRequest, clearRequest)
    return pending
  }

  function isCurrentRequest(fundCode: string, generation: number): boolean {
    return currentFundCode.value === fundCode && active && requestGeneration === generation
  }

  function resetState(): void {
    data.value = undefined
    error.value = ''
    isLoading.value = false
    selectedRange.value = defaultFundHistoryRange
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
    selectedData,
    selectedRange,
    selectRange,
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
