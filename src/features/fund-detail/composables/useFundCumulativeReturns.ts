import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundCumulativeReturns } from '@/domains/funds/models/fundCumulativeReturns.ts'
import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo.ts'
import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import { fetchTiantianFundCumulativeReturns } from '@/domains/funds/services/tiantian/fetchTiantianFundCumulativeReturns.ts'
import { buildFundReferenceIndexOptions } from '../config/fundCumulativeReturnsOptions.ts'
import { defaultFundHistoryRange } from '../config/fundHistoryRangeOptions.ts'
import type {
  FundReferenceIndexOption,
  LoadFundCumulativeReturns,
} from '../models/fundCumulativeReturnsChart'

export function useFundCumulativeReturns(
  load: LoadFundCumulativeReturns = fetchTiantianFundCumulativeReturns,
) {
  const currentFundCode = ref<string>()
  const referenceIndexOptions = shallowRef<readonly FundReferenceIndexOption[]>([])
  const selectedReferenceIndexCode = ref('')
  const selectedRange = ref<FundHistoryRange>(defaultFundHistoryRange)
  const data = shallowRef<FundCumulativeReturns>()
  const isLoading = ref(false)
  const error = ref('')
  const cache = new Map<string, FundCumulativeReturns>()

  let activeController: AbortController | undefined
  let requestGeneration = 0

  async function initialize(fundCode: string, basicInfo: FundBasicInfo): Promise<void> {
    const options = buildFundReferenceIndexOptions(
      basicInfo.trackingIndexCode,
      basicInfo.trackingIndexName,
    )
    const firstOption = options[0]
    if (!firstOption) return
    if (
      currentFundCode.value === fundCode &&
      selectedReferenceIndexCode.value &&
      sameOptions(referenceIndexOptions.value, options)
    ) {
      return
    }

    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = fundCode
    referenceIndexOptions.value = options
    selectedReferenceIndexCode.value = firstOption.code
    selectedRange.value = defaultFundHistoryRange
    data.value = undefined
    error.value = ''
    await request(false)
  }

  async function selectReferenceIndex(code: string): Promise<void> {
    if (
      code === selectedReferenceIndexCode.value ||
      !referenceIndexOptions.value.some((option) => option.code === code)
    ) {
      return
    }
    selectedReferenceIndexCode.value = code
    await request(false)
  }

  async function selectRange(range: FundHistoryRange): Promise<void> {
    if (range === selectedRange.value) return
    selectedRange.value = range
    await request(false)
  }

  async function retry(): Promise<void> {
    await request(true)
  }

  async function refresh(): Promise<void> {
    cache.clear()
    if (!currentFundCode.value) return
    await request(true)
  }

  function close(): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = undefined
    referenceIndexOptions.value = []
    selectedReferenceIndexCode.value = ''
    selectedRange.value = defaultFundHistoryRange
    data.value = undefined
    isLoading.value = false
    error.value = ''
  }

  async function request(force: boolean): Promise<void> {
    const fundCode = currentFundCode.value
    const referenceIndexCode = selectedReferenceIndexCode.value
    const range = selectedRange.value
    if (!fundCode || !referenceIndexCode) return

    cancelActiveRequest()
    const generation = ++requestGeneration
    const key = cacheKey(fundCode, referenceIndexCode, range)
    if (!force) {
      const cached = cache.get(key)
      if (cached) {
        data.value = cached
        isLoading.value = false
        error.value = ''
        return
      }
    }

    const controller = new AbortController()
    activeController = controller
    isLoading.value = true
    error.value = ''
    try {
      const result = await load(fundCode, referenceIndexCode, range, controller.signal)
      if (!isCurrentRequest(generation, fundCode, referenceIndexCode, range)) return
      cache.set(key, result)
      data.value = result
    } catch (requestError) {
      if (!isCurrentRequest(generation, fundCode, referenceIndexCode, range)) return
      if (!isAbortError(requestError)) {
        error.value = '累计收益加载失败，请稍后重试'
      }
    } finally {
      if (isCurrentRequest(generation, fundCode, referenceIndexCode, range)) {
        isLoading.value = false
        activeController = undefined
      }
    }
  }

  function isCurrentRequest(
    generation: number,
    fundCode: string,
    referenceIndexCode: string,
    range: FundHistoryRange,
  ): boolean {
    return (
      generation === requestGeneration &&
      currentFundCode.value === fundCode &&
      selectedReferenceIndexCode.value === referenceIndexCode &&
      selectedRange.value === range
    )
  }

  function cancelActiveRequest(): void {
    activeController?.abort()
    activeController = undefined
  }

  if (getCurrentScope()) onScopeDispose(close)

  return {
    close,
    currentFundCode,
    data,
    error,
    initialize,
    isLoading,
    referenceIndexOptions,
    refresh,
    retry,
    selectedRange,
    selectedReferenceIndexCode,
    selectRange,
    selectReferenceIndex,
  }
}

function cacheKey(fundCode: string, referenceIndexCode: string, range: FundHistoryRange): string {
  return `${fundCode}:${referenceIndexCode}:${range}`
}

function sameOptions(
  left: readonly FundReferenceIndexOption[],
  right: readonly FundReferenceIndexOption[],
): boolean {
  return (
    left.length === right.length &&
    left.every((option, index) => {
      const other = right[index]
      return option.code === other?.code && option.name === other.name
    })
  )
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
