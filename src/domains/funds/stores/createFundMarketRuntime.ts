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

export interface FundMarketRuntime {
  readonly snapshotsByCode: ShallowRef<Readonly<Record<string, FundSnapshot>>>
  readonly isRefreshing: Ref<boolean>
  readonly lastRefreshIssues: ShallowRef<readonly FundRefreshIssue[]>
  readonly lastSuccessfulRefreshAt: Ref<number | undefined>
  readonly lastRefreshSource: Ref<FundRefreshSource | undefined>
  readonly refreshAll: (options?: { readonly force?: boolean }) => Promise<void>
  readonly applySettingsEffect: (effect: FundSettingsEffect | undefined) => void
  readonly dispose: () => void
}

export function createFundMarketRuntime(options: FundMarketRuntimeOptions): FundMarketRuntime {
  const snapshotsByCode = shallowRef<Readonly<Record<string, FundSnapshot>>>(
    Object.fromEntries(
      options.initialFunds.map(({ code, name }) => [code, createEmptyFundSnapshot(code, name)]),
    ),
  )
  const isRefreshing = ref(false)
  const lastRefreshIssues = shallowRef<readonly FundRefreshIssue[]>([])
  const lastSuccessfulRefreshAt = ref<number | undefined>()
  const lastRefreshSource = ref<FundRefreshSource | undefined>()

  let activeController: AbortController | undefined
  let activeRefresh: Promise<void> | undefined
  let lifecycle = 0
  let disposed = false

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
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    invalidateActiveRefresh()
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
    refreshAll,
    snapshotsByCode,
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
