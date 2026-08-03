import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundAssetAllocation } from '@/domains/funds/models/fundAssetAllocation.ts'
import { fetchTiantianFundAssetAllocation } from '@/domains/funds/services/tiantian/fetchTiantianFundAssetAllocation.ts'

export type LoadFundAssetAllocation = (
  fundCode: string,
  signal?: AbortSignal,
) => Promise<FundAssetAllocation>

export function useFundAssetAllocation(
  load: LoadFundAssetAllocation = fetchTiantianFundAssetAllocation,
) {
  const currentFundCode = ref<string>()
  const data = shallowRef<FundAssetAllocation>()
  const error = ref('')
  const warning = ref('')
  const isLoading = ref(false)
  const cache = new Map<string, FundAssetAllocation>()
  let isActivated = false
  let activeRequest:
    | {
        readonly controller: AbortController
        readonly fundCode: string
        readonly generation: number
        readonly promise: Promise<FundAssetAllocation>
      }
    | undefined
  let requestGeneration = 0

  function open(fundCode: string): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = fundCode
    isActivated = false
    resetState()
  }

  function close(): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = undefined
    isActivated = false
    resetState()
  }

  async function activate(): Promise<void> {
    isActivated = true
    await request(false)
  }

  async function retry(): Promise<void> {
    if (!isActivated) return
    await request(true)
  }

  async function refresh(): Promise<void> {
    if (!isActivated) return
    await request(true)
  }

  async function request(force: boolean): Promise<void> {
    const fundCode = currentFundCode.value
    if (!fundCode || !isActivated) return
    if (!force) {
      const cached = cache.get(fundCode)
      if (cached) {
        applyResult(cached)
        return
      }
    }

    if (activeRequest && activeRequest.fundCode !== fundCode) cancelActiveRequest()
    const pending = activeRequest?.fundCode === fundCode ? activeRequest : startRequest(fundCode)
    isLoading.value = true
    error.value = ''
    warning.value = ''
    try {
      const result = await pending.promise
      if (isCurrentRequest(fundCode, pending.generation)) {
        cache.set(fundCode, result)
        applyResult(result)
      }
    } catch (requestError) {
      if (isCurrentRequest(fundCode, pending.generation) && !isAbortError(requestError)) {
        if (data.value) warning.value = '资产配置刷新失败，当前显示上次数据'
        else error.value = '资产配置加载失败，请稍后重试'
      }
    } finally {
      if (isCurrentRequest(fundCode, pending.generation)) isLoading.value = false
    }
  }

  function startRequest(fundCode: string): NonNullable<typeof activeRequest> {
    const controller = new AbortController()
    const generation = ++requestGeneration
    const promise = load(fundCode, controller.signal)
    const pending = { controller, fundCode, generation, promise }
    activeRequest = pending
    const clearRequest = () => {
      if (activeRequest?.generation === generation) activeRequest = undefined
    }
    void promise.then(clearRequest, clearRequest)
    return pending
  }

  function applyResult(result: FundAssetAllocation): void {
    data.value = result
    error.value = ''
    warning.value = ''
    isLoading.value = false
  }

  function isCurrentRequest(fundCode: string, generation: number): boolean {
    return isActivated && currentFundCode.value === fundCode && requestGeneration === generation
  }

  function resetState(): void {
    data.value = undefined
    error.value = ''
    warning.value = ''
    isLoading.value = false
  }

  function cancelActiveRequest(): void {
    activeRequest?.controller.abort()
    activeRequest = undefined
  }

  if (getCurrentScope()) onScopeDispose(close)

  return {
    activate,
    close,
    data,
    error,
    isLoading,
    open,
    refresh,
    retry,
    warning,
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
