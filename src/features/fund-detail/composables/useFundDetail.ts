import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundBasicInfo } from '../../../domains/funds/models/fundBasicInfo.ts'
import { fetchTiantianFundBasicInfo } from '../../../domains/funds/services/tiantian/fetchTiantianFundBasicInfo.ts'

export type LoadFundBasicInfo = (code: string, signal?: AbortSignal) => Promise<FundBasicInfo>

export function useFundDetail(load: LoadFundBasicInfo = fetchTiantianFundBasicInfo) {
  const currentCode = ref<string>()
  const basicInfo = shallowRef<FundBasicInfo>()
  const isLoading = ref(false)
  const error = ref('')
  const visible = ref(false)
  const cache = new Map<string, FundBasicInfo>()

  let activeController: AbortController | undefined
  let requestGeneration = 0

  async function open(code: string): Promise<void> {
    cancelActiveRequest()
    requestGeneration += 1
    currentCode.value = code
    visible.value = true
    error.value = ''
    const cached = cache.get(code)
    if (cached) {
      basicInfo.value = cached
      isLoading.value = false
      return
    }
    await request(code)
  }

  function close(): void {
    cancelActiveRequest()
    requestGeneration += 1
    visible.value = false
    currentCode.value = undefined
    basicInfo.value = undefined
    isLoading.value = false
    error.value = ''
  }

  async function retry(): Promise<void> {
    const code = currentCode.value
    if (!visible.value || !code) return
    await request(code)
  }

  async function refresh(): Promise<void> {
    cache.clear()
    const code = currentCode.value
    if (!visible.value || !code) return
    await request(code)
  }

  async function request(code: string): Promise<void> {
    cancelActiveRequest()
    const controller = new AbortController()
    activeController = controller
    const generation = ++requestGeneration
    basicInfo.value = undefined
    isLoading.value = true
    error.value = ''
    try {
      const result = await load(code, controller.signal)
      if (!isCurrentRequest(generation, code)) return
      cache.set(code, result)
      basicInfo.value = result
    } catch (requestError) {
      if (!isCurrentRequest(generation, code) || isAbortError(requestError)) return
      error.value = '基金基础信息加载失败，请稍后重试'
    } finally {
      if (isCurrentRequest(generation, code)) {
        isLoading.value = false
        activeController = undefined
      }
    }
  }

  function isCurrentRequest(generation: number, code: string): boolean {
    return generation === requestGeneration && visible.value && currentCode.value === code
  }

  function cancelActiveRequest(): void {
    activeController?.abort()
    activeController = undefined
  }

  if (getCurrentScope()) {
    onScopeDispose(close)
  }

  return {
    basicInfo,
    close,
    currentCode,
    error,
    isLoading,
    open,
    refresh,
    retry,
    visible,
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
