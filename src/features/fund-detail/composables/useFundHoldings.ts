import { computed, getCurrentScope, onScopeDispose, ref, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type {
  FundHoldingQuote,
  FundHoldingQuoteRequest,
} from '@/domains/funds/models/fundHoldingQuote.ts'
import type { FundHoldingsDisclosure } from '@/domains/funds/models/fundHoldingsDisclosure.ts'
import { fetchTencentFundHoldingQuotes } from '@/domains/funds/services/tencent/fetchTencentFundHoldingQuotes.ts'
import { fetchTiantianFundHoldingDates } from '@/domains/funds/services/tiantian/fetchTiantianFundHoldingDates.ts'
import { fetchTiantianFundHoldingsDisclosure } from '@/domains/funds/services/tiantian/fetchTiantianFundHoldingsDisclosure.ts'
import type { FundHoldingsView } from '../models/fundHoldingsSectionModel.ts'
import { toFundAssetAllocationChartModel } from '../presenters/toFundAssetAllocationChartModel.ts'
import { toFundHoldingsSectionModel } from '../presenters/toFundHoldingsSectionModel.ts'
import { type LoadFundAssetAllocation, useFundAssetAllocation } from './useFundAssetAllocation.ts'

type LoadHoldingDates = (fundCode: string, signal?: AbortSignal) => Promise<readonly string[]>
type LoadHoldingsDisclosure = (
  fundCode: string,
  reportDate: string,
  signal?: AbortSignal,
) => Promise<FundHoldingsDisclosure>
type LoadHoldingQuotes = (
  requests: readonly FundHoldingQuoteRequest[],
  signal?: AbortSignal,
) => Promise<readonly FundHoldingQuote[]>
type TimerHandle = ReturnType<typeof setInterval>

export interface UseFundHoldingsOptions {
  readonly clearInterval?: (handle: TimerHandle) => void
  readonly loadAssetAllocation?: LoadFundAssetAllocation
  readonly loadDates?: LoadHoldingDates
  readonly loadDisclosure?: LoadHoldingsDisclosure
  readonly loadQuotes?: LoadHoldingQuotes
  readonly setInterval?: (callback: () => void, delay: number) => TimerHandle
}

export function useFundHoldings(
  isSectionActive: MaybeRefOrGetter<boolean>,
  options: UseFundHoldingsOptions = {},
) {
  const loadDates = options.loadDates ?? fetchTiantianFundHoldingDates
  const loadDisclosure = options.loadDisclosure ?? fetchTiantianFundHoldingsDisclosure
  const loadQuotes = options.loadQuotes ?? fetchTencentFundHoldingQuotes
  const scheduleInterval = options.setInterval ?? globalThis.setInterval
  const clearScheduledInterval = options.clearInterval ?? globalThis.clearInterval
  const assetAllocation = useFundAssetAllocation(options.loadAssetAllocation)
  const currentCode = ref<string>()
  const isActivated = ref(false)
  const activeView = ref<FundHoldingsView>('positions')
  const reportDates = ref<readonly string[]>([])
  const selectedReportDate = ref<string>()
  const disclosure = shallowRef<FundHoldingsDisclosure>()
  const quotes = shallowRef<readonly FundHoldingQuote[]>([])
  const isDatesLoading = ref(false)
  const isHoldingsLoading = ref(false)
  const isQuotesLoading = ref(false)
  const holdingsError = ref('')
  const holdingsWarning = ref('')
  const quoteWarning = ref('')
  const datesCache = new Map<string, readonly string[]>()
  const disclosureCache = new Map<string, FundHoldingsDisclosure>()

  let datesController: AbortController | undefined
  let disclosureController: AbortController | undefined
  let quotesController: AbortController | undefined
  let datesGeneration = 0
  let disclosureGeneration = 0
  let quotesGeneration = 0
  let pollingTimer: TimerHandle | undefined

  const model = computed(() => {
    const holdings = toFundHoldingsSectionModel({
      activeView: activeView.value,
      disclosure: disclosure.value,
      holdingsError: holdingsError.value,
      holdingsWarning: holdingsWarning.value,
      isDatesLoading: isDatesLoading.value,
      isHoldingsLoading: isHoldingsLoading.value,
      isQuotesLoading: isQuotesLoading.value,
      quotes: quotes.value,
      quoteWarning: quoteWarning.value,
      reportDates: reportDates.value,
      selectedReportDate: selectedReportDate.value,
    })
    return {
      ...holdings,
      allocation: {
        chart: assetAllocation.data.value
          ? toFundAssetAllocationChartModel(assetAllocation.data.value)
          : undefined,
        error: assetAllocation.error.value,
        isLoading: assetAllocation.isLoading.value,
        warning: assetAllocation.warning.value,
      },
    }
  })

  watch(
    () => toValue(isSectionActive),
    (visible, wasVisible) => {
      if (!isActivated.value || activeView.value !== 'positions') return
      if (visible && !wasVisible && disclosure.value) void refreshQuotes()
      updatePolling()
    },
  )

  function open(fundCode: string): void {
    resetSession()
    currentCode.value = fundCode
    assetAllocation.open(fundCode)
  }

  function close(): void {
    resetSession()
    currentCode.value = undefined
    assetAllocation.close()
  }

  async function activate(): Promise<void> {
    if (!currentCode.value || isActivated.value) return
    isActivated.value = true
    await loadReportDates(false)
  }

  async function loadReportDates(force: boolean): Promise<boolean> {
    const fundCode = currentCode.value
    if (!fundCode || !isActivated.value) return false
    if (!force) {
      const cached = datesCache.get(fundCode)
      if (cached) {
        reportDates.value = cached
        selectedReportDate.value = cached[0]
        await loadSelectedDisclosure(false)
        return true
      }
    }

    datesController?.abort()
    const controller = new AbortController()
    datesController = controller
    const generation = ++datesGeneration
    const previousDates = reportDates.value
    const previousSelection = selectedReportDate.value
    isDatesLoading.value = true
    holdingsError.value = ''
    try {
      const nextDates = await loadDates(fundCode, controller.signal)
      if (!isCurrentDatesRequest(generation, fundCode)) return false
      datesCache.set(fundCode, nextDates)
      reportDates.value = nextDates
      const hasNewLatest = previousDates[0] !== undefined && previousDates[0] !== nextDates[0]
      selectedReportDate.value = hasNewLatest
        ? nextDates[0]
        : previousSelection && nextDates.includes(previousSelection)
          ? previousSelection
          : nextDates[0]
      holdingsWarning.value = ''
      await loadSelectedDisclosure(force)
      return true
    } catch (error) {
      if (!isCurrentDatesRequest(generation, fundCode) || isAbortError(error)) return false
      if (disclosure.value) holdingsWarning.value = '基金持仓刷新失败，当前显示上次数据'
      else holdingsError.value = '基金持仓加载失败，请稍后重试'
      return false
    } finally {
      if (isCurrentDatesRequest(generation, fundCode)) {
        isDatesLoading.value = false
        datesController = undefined
      }
    }
  }

  async function loadSelectedDisclosure(force: boolean): Promise<boolean> {
    const fundCode = currentCode.value
    const reportDate = selectedReportDate.value
    if (!fundCode || !reportDate || !isActivated.value) return false
    const cacheKey = `${fundCode}:${reportDate}`
    if (!force) {
      const cached = disclosureCache.get(cacheKey)
      if (cached) {
        disclosure.value = cached
        await refreshQuotes()
        updatePolling()
        return true
      }
    }

    disclosureController?.abort()
    quotesController?.abort()
    const controller = new AbortController()
    disclosureController = controller
    const generation = ++disclosureGeneration
    isHoldingsLoading.value = true
    holdingsError.value = ''
    try {
      const nextDisclosure = await loadDisclosure(fundCode, reportDate, controller.signal)
      if (!isCurrentDisclosureRequest(generation, fundCode, reportDate)) return false
      disclosureCache.set(cacheKey, nextDisclosure)
      disclosure.value = nextDisclosure
      holdingsWarning.value = ''
      await refreshQuotes()
      updatePolling()
      return true
    } catch (error) {
      if (!isCurrentDisclosureRequest(generation, fundCode, reportDate) || isAbortError(error)) {
        return false
      }
      if (disclosure.value) holdingsWarning.value = '基金持仓刷新失败，当前显示上次数据'
      else holdingsError.value = '基金持仓加载失败，请稍后重试'
      return false
    } finally {
      if (isCurrentDisclosureRequest(generation, fundCode, reportDate)) {
        isHoldingsLoading.value = false
        disclosureController = undefined
      }
    }
  }

  async function refreshQuotes(): Promise<boolean> {
    const fundCode = currentCode.value
    const reportDate = selectedReportDate.value
    const currentDisclosure = disclosure.value
    if (!fundCode || !reportDate || !currentDisclosure || isQuotesLoading.value) return false
    const requests = quoteRequests(currentDisclosure)
    if (requests.length === 0) {
      quotes.value = []
      quoteWarning.value = ''
      return true
    }

    quotesController?.abort()
    const controller = new AbortController()
    quotesController = controller
    const generation = ++quotesGeneration
    isQuotesLoading.value = true
    try {
      const nextQuotes = await loadQuotes(requests, controller.signal)
      if (!isCurrentQuotesRequest(generation, fundCode, reportDate)) return false
      quotes.value = nextQuotes
      quoteWarning.value = ''
      return true
    } catch (error) {
      if (!isCurrentQuotesRequest(generation, fundCode, reportDate) || isAbortError(error))
        return false
      quoteWarning.value = '实时行情加载失败，持仓数据不受影响'
      return false
    } finally {
      if (isCurrentQuotesRequest(generation, fundCode, reportDate)) {
        isQuotesLoading.value = false
        quotesController = undefined
      }
    }
  }

  async function selectReportDate(reportDate: string): Promise<void> {
    if (!reportDates.value.includes(reportDate) || reportDate === selectedReportDate.value) return
    disclosureController?.abort()
    quotesController?.abort()
    disclosureGeneration += 1
    quotesGeneration += 1
    selectedReportDate.value = reportDate
    disclosure.value = undefined
    quotes.value = []
    quoteWarning.value = ''
    await loadSelectedDisclosure(false)
  }

  function selectView(view: FundHoldingsView): void {
    if (view === activeView.value) return
    activeView.value = view
    if (view === 'allocation') {
      stopPolling()
      quotesController?.abort()
      void assetAllocation.activate()
      return
    }
    if (toValue(isSectionActive) && disclosure.value) void refreshQuotes()
    updatePolling()
  }

  async function refresh(): Promise<void> {
    if (!currentCode.value || !isActivated.value) return
    const allocationRefresh =
      toValue(isSectionActive) && activeView.value === 'allocation'
        ? assetAllocation.refresh()
        : Promise.resolve()
    const datesLoaded = await loadReportDates(true)
    if (!datesLoaded && selectedReportDate.value) await loadSelectedDisclosure(true)
    await allocationRefresh
  }

  async function retryAllocation(): Promise<void> {
    await assetAllocation.retry()
  }

  async function retryHoldings(): Promise<void> {
    if (reportDates.value.length === 0) await loadReportDates(true)
    else await loadSelectedDisclosure(true)
  }

  async function retryQuotes(): Promise<void> {
    await refreshQuotes()
  }

  function updatePolling(): void {
    stopPolling()
    if (
      isActivated.value &&
      activeView.value === 'positions' &&
      toValue(isSectionActive) &&
      disclosure.value &&
      quoteRequests(disclosure.value).length > 0
    ) {
      pollingTimer = scheduleInterval(() => void refreshQuotes(), 10_000)
    }
  }

  function stopPolling(): void {
    if (pollingTimer !== undefined) clearScheduledInterval(pollingTimer)
    pollingTimer = undefined
  }

  function resetSession(): void {
    stopPolling()
    datesController?.abort()
    disclosureController?.abort()
    quotesController?.abort()
    datesController = undefined
    disclosureController = undefined
    quotesController = undefined
    datesGeneration += 1
    disclosureGeneration += 1
    quotesGeneration += 1
    isActivated.value = false
    activeView.value = 'positions'
    reportDates.value = []
    selectedReportDate.value = undefined
    disclosure.value = undefined
    quotes.value = []
    isDatesLoading.value = false
    isHoldingsLoading.value = false
    isQuotesLoading.value = false
    holdingsError.value = ''
    holdingsWarning.value = ''
    quoteWarning.value = ''
  }

  function isCurrentDatesRequest(generation: number, fundCode: string): boolean {
    return generation === datesGeneration && currentCode.value === fundCode && isActivated.value
  }

  function isCurrentDisclosureRequest(
    generation: number,
    fundCode: string,
    reportDate: string,
  ): boolean {
    return (
      generation === disclosureGeneration &&
      currentCode.value === fundCode &&
      selectedReportDate.value === reportDate &&
      isActivated.value
    )
  }

  function isCurrentQuotesRequest(
    generation: number,
    fundCode: string,
    reportDate: string,
  ): boolean {
    return (
      generation === quotesGeneration &&
      currentCode.value === fundCode &&
      selectedReportDate.value === reportDate &&
      isActivated.value
    )
  }

  if (getCurrentScope()) onScopeDispose(close)

  return {
    activate,
    close,
    model,
    open,
    refresh,
    retryAllocation,
    retryHoldings,
    retryQuotes,
    selectReportDate,
    selectView,
  }
}

function quoteRequests(disclosure: FundHoldingsDisclosure): readonly FundHoldingQuoteRequest[] {
  const seen = new Set<string>()
  const requests: FundHoldingQuoteRequest[] = []
  for (const holding of [...disclosure.stocks, ...disclosure.bonds]) {
    if (!holding.market) continue
    const key = `${holding.market}:${holding.code}`
    if (!seen.has(key)) {
      seen.add(key)
      requests.push({ code: holding.code, market: holding.market })
    }
  }
  return requests
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
