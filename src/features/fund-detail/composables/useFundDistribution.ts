import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundDistributionHistory } from '@/domains/funds/models/fundDistributionHistory'
import { fetchTiantianFundDistribution } from '@/domains/funds/services/tiantian/fetchTiantianFundDistribution'
import type { LoadFundDistribution } from '../models/fundDistributionTableModel'

export function useFundDistribution(load: LoadFundDistribution = fetchTiantianFundDistribution) {
  const currentFundCode = ref<string>()
  const data = shallowRef<FundDistributionHistory>()
  const error = ref('')
  const hasLoaded = ref(false)
  const isActivated = ref(false)
  const isLoading = ref(false)
  const cache = new Map<string, FundDistributionHistory>()

  let activeRequest:
    | {
        readonly controller: AbortController
        readonly fundCode: string
        readonly generation: number
        readonly promise: Promise<FundDistributionHistory>
      }
    | undefined
  let requestGeneration = 0

  function initialize(fundCode: string): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = fundCode
    isActivated.value = false
    isLoading.value = false
    error.value = ''
    const cached = cache.get(fundCode)
    data.value = cached
    hasLoaded.value = cached !== undefined
  }

  async function activate(): Promise<void> {
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

  function close(): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = undefined
    data.value = undefined
    error.value = ''
    hasLoaded.value = false
    isActivated.value = false
    isLoading.value = false
  }

  async function request(force: boolean): Promise<void> {
    const fundCode = currentFundCode.value
    if (!fundCode) return
    if (!activeRequest && !force) {
      const cached = cache.get(fundCode)
      if (cached) {
        applyResult(cached)
        return
      }
    }

    const pending = activeRequest?.fundCode === fundCode ? activeRequest : startRequest(fundCode)
    isLoading.value = true
    error.value = ''
    try {
      const result = await pending.promise
      if (isCurrentRequest(fundCode, pending.generation)) {
        applyResult(result)
      }
    } catch (requestError) {
      if (isCurrentRequest(fundCode, pending.generation) && !isAbortError(requestError)) {
        error.value = '基金分红送配加载失败，请稍后重试'
      }
    } finally {
      if (isCurrentRequest(fundCode, pending.generation)) {
        isLoading.value = false
      }
    }
  }

  function startRequest(fundCode: string): NonNullable<typeof activeRequest> {
    const controller = new AbortController()
    const generation = ++requestGeneration
    const promise = load(fundCode, controller.signal).then((result) => {
      if (generation === requestGeneration && currentFundCode.value === fundCode) {
        cache.set(fundCode, result)
      }
      return result
    })
    const pending = { controller, fundCode, generation, promise }
    activeRequest = pending
    const clearRequest = () => {
      if (activeRequest?.generation === generation) activeRequest = undefined
    }
    void promise.then(clearRequest, clearRequest)
    return pending
  }

  function applyResult(result: FundDistributionHistory): void {
    data.value = result
    error.value = ''
    hasLoaded.value = true
    isLoading.value = false
  }

  function isCurrentRequest(fundCode: string, generation: number): boolean {
    return currentFundCode.value === fundCode && requestGeneration === generation
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
    hasLoaded,
    initialize,
    isActivated,
    isLoading,
    refresh,
    retry,
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
