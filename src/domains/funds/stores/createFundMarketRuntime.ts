import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

import { createEmptyFundMarketData } from '../models/createEmptyFundMarketData.ts'
import type { FundSetting } from '../models/fundSettings.ts'
import type { FundMarketData } from '../models/fundMarketData.ts'
import type { FundRefreshIssue } from '../services/tiantian/fundRefreshIssue.ts'
import {
  fetchTiantianFundMarketData,
  type FundRefreshSource,
} from '../services/tiantian/fetchTiantianFundMarketData.ts'
import type { FundSettingsEffect } from './createFundSettingsCommandModule.ts'
import { mergeFundRefreshResult } from './mergeFundRefreshResult.ts'

export interface FundMarketRuntimeOptions {
  readonly getFundCodes: () => readonly string[]
  readonly initialFunds: readonly FundSetting[]
  readonly syncObservedNames: (names: Readonly<Record<string, string>>) => boolean
}

export interface FundPollingConfiguration {
  readonly enabled: boolean
  readonly intervalMs: number
}

export interface FundMarketRuntime {
  readonly marketDataByCode: ShallowRef<Readonly<Record<string, FundMarketData>>>
  readonly previousConfirmedMarketDataByCode: ShallowRef<Readonly<Record<string, FundMarketData>>>
  readonly isRefreshing: Ref<boolean>
  readonly lastRefreshIssues: ShallowRef<readonly FundRefreshIssue[]>
  readonly lastSuccessfulRefreshAt: Ref<number | undefined>
  readonly lastRefreshSource: Ref<FundRefreshSource | undefined>
  readonly refreshAll: (options?: { readonly force?: boolean }) => Promise<void>
  readonly applySettingsEffect: (effect: FundSettingsEffect | undefined) => void
  readonly setPollingConfiguration: (configuration: FundPollingConfiguration) => void
  readonly startPolling: () => void
  readonly stopPolling: () => void
  readonly dispose: () => void
}

export function createFundMarketRuntime(options: FundMarketRuntimeOptions): FundMarketRuntime {
  const marketDataByCode = shallowRef<Readonly<Record<string, FundMarketData>>>(
    Object.fromEntries(
      options.initialFunds.map(({ code, name }) => [code, createEmptyFundMarketData(code, name)]),
    ),
  )
  const previousConfirmedMarketDataByCode = shallowRef<Readonly<Record<string, FundMarketData>>>({})
  const isRefreshing = ref(false)
  const lastRefreshIssues = shallowRef<readonly FundRefreshIssue[]>([])
  const lastSuccessfulRefreshAt = ref<number | undefined>()
  const lastRefreshSource = ref<FundRefreshSource | undefined>()

  let activeController: AbortController | undefined
  let activeRefresh: Promise<void> | undefined
  let lifecycle = 0
  let disposed = false
  let polling = false
  let refreshTimer: ReturnType<typeof setInterval> | undefined
  let pollingConfiguration: FundPollingConfiguration = {
    enabled: true,
    intervalMs: 120_000,
  }

  function refreshAll(requestOptions?: { readonly force?: boolean }): Promise<void> {
    if (activeRefresh) return activeRefresh
    return refreshCodes(options.getFundCodes(), requestOptions)
  }

  function refreshCodes(
    codes: readonly string[],
    requestOptions?: { readonly force?: boolean },
  ): Promise<void> {
    if (disposed || activeRefresh) return activeRefresh ?? Promise.resolve()

    const currentCodes = new Set(options.getFundCodes())
    const requestedCodes = [...new Set(codes)].filter((code) => currentCodes.has(code))
    if (requestedCodes.length === 0) {
      lastRefreshIssues.value = []
      return Promise.resolve()
    }

    const currentLifecycle = lifecycle
    const controller = new AbortController()
    activeController = controller
    isRefreshing.value = true

    const request = fetchTiantianFundMarketData(requestedCodes, controller.signal, requestOptions)
      .then((batch) => {
        if (currentLifecycle !== lifecycle) return

        const merged = mergeFundRefreshResult(
          marketDataByCode.value,
          options.getFundCodes(),
          requestedCodes,
          batch,
        )
        lastRefreshIssues.value = merged.issues
        if (merged.updatedCount === 0) return

        previousConfirmedMarketDataByCode.value = advancePreviousConfirmedMarketData(
          previousConfirmedMarketDataByCode.value,
          marketDataByCode.value,
          merged.marketDataByCode,
        )
        marketDataByCode.value = merged.marketDataByCode
        lastSuccessfulRefreshAt.value = batch.fetchedAt
        lastRefreshSource.value = batch.source
        syncObservedNames(batch, requestedCodes, currentCodes, merged.issues)
      })
      .catch((error: unknown) => {
        if (currentLifecycle === lifecycle && !isAbortError(error)) {
          lastRefreshIssues.value = requestedCodes.map((fundCode) => ({
            code: 'request-failed',
            fundCode,
          }))
        }
      })
      .finally(() => {
        if (activeRefresh === request) {
          activeRefresh = undefined
          activeController = undefined
          isRefreshing.value = false
        }
      })

    activeRefresh = request
    return request
  }

  function applySettingsEffect(effect: FundSettingsEffect | undefined): void {
    if (!effect || disposed) return

    invalidateActiveRefresh()
    if (effect.kind === 'settings-replaced') {
      const fundsByCode = new Map(effect.funds.map((fund) => [fund.code, fund.name]))
      const nextMarketDataByCode: Record<string, FundMarketData> = {}
      for (const code of options.getFundCodes()) {
        const name = fundsByCode.get(code)
        if (name === undefined) continue
        const existing = marketDataByCode.value[code]
        nextMarketDataByCode[code] = existing
          ? { ...existing, name }
          : createEmptyFundMarketData(code, name)
      }
      marketDataByCode.value = nextMarketDataByCode

      const nextPreviousConfirmedMarketDataByCode: Record<string, FundMarketData> = {}
      for (const [code, previousConfirmedMarketData] of Object.entries(
        previousConfirmedMarketDataByCode.value,
      )) {
        const name = fundsByCode.get(code)
        if (name !== undefined) {
          nextPreviousConfirmedMarketDataByCode[code] = { ...previousConfirmedMarketData, name }
        }
      }
      previousConfirmedMarketDataByCode.value = nextPreviousConfirmedMarketDataByCode
      void refreshAll()
      return
    }

    if (effect.kind === 'funds-added') {
      marketDataByCode.value = {
        ...marketDataByCode.value,
        ...Object.fromEntries(
          effect.funds.map(({ code, name }) => [code, createEmptyFundMarketData(code, name)]),
        ),
      }
      void refreshCodes(effect.funds.map(({ code }) => code))
      return
    }

    const nextMarketDataByCode = { ...marketDataByCode.value }
    delete nextMarketDataByCode[effect.code]
    marketDataByCode.value = nextMarketDataByCode
    const nextPreviousConfirmedMarketDataByCode = {
      ...previousConfirmedMarketDataByCode.value,
    }
    delete nextPreviousConfirmedMarketDataByCode[effect.code]
    previousConfirmedMarketDataByCode.value = nextPreviousConfirmedMarketDataByCode
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    stopPolling()
    invalidateActiveRefresh()
  }

  function setPollingConfiguration(configuration: FundPollingConfiguration): void {
    pollingConfiguration = { ...configuration }
    if (!polling || typeof document === 'undefined') return

    clearRefreshTimer()
    if (document.hidden || !pollingConfiguration.enabled) return

    void refreshAll()
    refreshTimer = setInterval(() => void refreshAll(), pollingConfiguration.intervalMs)
  }

  function startPolling(): void {
    if (polling || disposed || typeof document === 'undefined') return

    polling = true
    document.addEventListener('visibilitychange', handleVisibilityChange)
    handleVisibilityChange()
  }

  function stopPolling(): void {
    if (!polling) {
      clearRefreshTimer()
      return
    }

    polling = false
    clearRefreshTimer()
    invalidateActiveRefresh()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  function handleVisibilityChange(): void {
    clearRefreshTimer()

    if (!polling || document.hidden) {
      invalidateActiveRefresh()
      return
    }

    if (!pollingConfiguration.enabled) return
    refreshTimer = setInterval(() => void refreshAll(), pollingConfiguration.intervalMs)
  }

  function clearRefreshTimer(): void {
    if (refreshTimer !== undefined) {
      clearInterval(refreshTimer)
      refreshTimer = undefined
    }
  }

  function invalidateActiveRefresh(): void {
    lifecycle += 1
    activeController?.abort()
    activeController = undefined
    activeRefresh = undefined
    isRefreshing.value = false
  }

  function syncObservedNames(
    batch: {
      readonly marketData: readonly FundMarketData[]
    },
    requestedCodes: readonly string[],
    currentCodes: ReadonlySet<string>,
    issues: readonly FundRefreshIssue[],
  ): void {
    const requested = new Set(requestedCodes)
    const observedNames: Record<string, string> = {}
    for (const marketData of batch.marketData) {
      if (requested.has(marketData.code) && currentCodes.has(marketData.code)) {
        observedNames[marketData.code] = marketData.name
      }
    }
    if (Object.keys(observedNames).length === 0) return

    try {
      if (!options.syncObservedNames(observedNames)) {
        lastRefreshIssues.value = [...issues, { code: 'persistence-failed' }]
      }
    } catch {
      lastRefreshIssues.value = [...issues, { code: 'persistence-failed' }]
    }
  }

  return {
    applySettingsEffect,
    dispose,
    isRefreshing,
    lastRefreshIssues,
    lastRefreshSource,
    lastSuccessfulRefreshAt,
    previousConfirmedMarketDataByCode,
    refreshAll,
    setPollingConfiguration,
    marketDataByCode,
    startPolling,
    stopPolling,
  }
}

function advancePreviousConfirmedMarketData(
  previousConfirmedMarketDataByCode: Readonly<Record<string, FundMarketData>>,
  currentMarketDataByCode: Readonly<Record<string, FundMarketData>>,
  nextMarketDataByCode: Readonly<Record<string, FundMarketData>>,
): Readonly<Record<string, FundMarketData>> {
  let result: Record<string, FundMarketData> | undefined
  for (const [code, nextMarketData] of Object.entries(nextMarketDataByCode)) {
    const currentMarketData = currentMarketDataByCode[code]
    if (!currentMarketData || !isConfirmedDateAdvance(currentMarketData, nextMarketData)) continue
    result ??= { ...previousConfirmedMarketDataByCode }
    result[code] = currentMarketData
  }
  return result ?? previousConfirmedMarketDataByCode
}

function isConfirmedDateAdvance(current: FundMarketData, next: FundMarketData): boolean {
  return (
    current.nav !== null &&
    current.navDate !== null &&
    next.nav !== null &&
    next.navDate !== null &&
    next.navDate > current.navDate
  )
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
