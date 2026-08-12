import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

import { createEmptyFundSnapshot } from '../models/createEmptyFundSnapshot.ts'
import type { FundSetting } from '../models/fundSettings.ts'
import type { FundSnapshot } from '../models/fundSnapshot.ts'
import type { FundRefreshIssue } from '../services/tiantian/fundRefreshIssue.ts'
import {
  fetchTiantianFundSnapshots,
  type FundRefreshSource,
} from '../services/tiantian/fetchTiantianFundSnapshots.ts'
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
  readonly snapshotsByCode: ShallowRef<Readonly<Record<string, FundSnapshot>>>
  readonly previousSnapshotsByCode: ShallowRef<Readonly<Record<string, FundSnapshot>>>
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
  const snapshotsByCode = shallowRef<Readonly<Record<string, FundSnapshot>>>(
    Object.fromEntries(
      options.initialFunds.map(({ code, name }) => [code, createEmptyFundSnapshot(code, name)]),
    ),
  )
  const previousSnapshotsByCode = shallowRef<Readonly<Record<string, FundSnapshot>>>({})
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

    const request = fetchTiantianFundSnapshots(requestedCodes, controller.signal, requestOptions)
      .then((batch) => {
        if (currentLifecycle !== lifecycle) return

        const merged = mergeFundRefreshResult(
          snapshotsByCode.value,
          options.getFundCodes(),
          requestedCodes,
          batch,
        )
        lastRefreshIssues.value = merged.issues
        if (merged.updatedCount === 0) return

        previousSnapshotsByCode.value = advancePreviousSnapshots(
          previousSnapshotsByCode.value,
          snapshotsByCode.value,
          merged.snapshotsByCode,
        )
        snapshotsByCode.value = merged.snapshotsByCode
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
      const nextSnapshots: Record<string, FundSnapshot> = {}
      for (const code of options.getFundCodes()) {
        const name = fundsByCode.get(code)
        if (name === undefined) continue
        const existing = snapshotsByCode.value[code]
        nextSnapshots[code] = existing ? { ...existing, name } : createEmptyFundSnapshot(code, name)
      }
      snapshotsByCode.value = nextSnapshots

      const nextPreviousSnapshots: Record<string, FundSnapshot> = {}
      for (const [code, snapshot] of Object.entries(previousSnapshotsByCode.value)) {
        const name = fundsByCode.get(code)
        if (name !== undefined) nextPreviousSnapshots[code] = { ...snapshot, name }
      }
      previousSnapshotsByCode.value = nextPreviousSnapshots
      void refreshAll()
      return
    }

    if (effect.kind === 'funds-added') {
      snapshotsByCode.value = {
        ...snapshotsByCode.value,
        ...Object.fromEntries(
          effect.funds.map(({ code, name }) => [code, createEmptyFundSnapshot(code, name)]),
        ),
      }
      void refreshCodes(effect.funds.map(({ code }) => code))
      return
    }

    const nextSnapshots = { ...snapshotsByCode.value }
    delete nextSnapshots[effect.code]
    snapshotsByCode.value = nextSnapshots
    const nextPreviousSnapshots = { ...previousSnapshotsByCode.value }
    delete nextPreviousSnapshots[effect.code]
    previousSnapshotsByCode.value = nextPreviousSnapshots
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

    void refreshAll()
    if (pollingConfiguration.enabled) {
      refreshTimer = setInterval(() => void refreshAll(), pollingConfiguration.intervalMs)
    }
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
      readonly snapshots: readonly FundSnapshot[]
    },
    requestedCodes: readonly string[],
    currentCodes: ReadonlySet<string>,
    issues: readonly FundRefreshIssue[],
  ): void {
    const requested = new Set(requestedCodes)
    const observedNames: Record<string, string> = {}
    for (const snapshot of batch.snapshots) {
      if (requested.has(snapshot.code) && currentCodes.has(snapshot.code)) {
        observedNames[snapshot.code] = snapshot.name
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
    previousSnapshotsByCode,
    refreshAll,
    setPollingConfiguration,
    snapshotsByCode,
    startPolling,
    stopPolling,
  }
}

function advancePreviousSnapshots(
  previousSnapshots: Readonly<Record<string, FundSnapshot>>,
  currentSnapshots: Readonly<Record<string, FundSnapshot>>,
  nextSnapshots: Readonly<Record<string, FundSnapshot>>,
): Readonly<Record<string, FundSnapshot>> {
  let result: Record<string, FundSnapshot> | undefined
  for (const [code, nextSnapshot] of Object.entries(nextSnapshots)) {
    const currentSnapshot = currentSnapshots[code]
    if (!currentSnapshot || !isConfirmedDateAdvance(currentSnapshot, nextSnapshot)) continue
    result ??= { ...previousSnapshots }
    result[code] = currentSnapshot
  }
  return result ?? previousSnapshots
}

function isConfirmedDateAdvance(current: FundSnapshot, next: FundSnapshot): boolean {
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
