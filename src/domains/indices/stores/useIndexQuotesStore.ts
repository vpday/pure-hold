import { defineStore } from 'pinia'
import { onScopeDispose, ref, shallowRef } from 'vue'

import { defaultIndexDefinitions } from '../config/defaultIndexDefinitions'
import type { IndexGroupDefinition } from '../models/indexGroupDefinition'
import type { IndexDefinition } from '../models/indexDefinition'
import type { IndexQuoteBatch, IndexQuoteHealth, IndexQuoteSnapshot } from '../models/indexQuote'
import type { IndexQuoteIssue } from '../models/indexQuoteIssue'
import { createIndexSettingsCommandModule } from '../services/createIndexSettingsCommandModule.ts'
import type { CommitIndexGroupsResult } from '../services/createIndexSettingsCommandModule.ts'
import { fetchEastmoneyIndexQuotes } from '../services/eastmoney/fetchEastmoneyIndexQuotes'
import { loadIndexGroups } from '../services/persistence/loadIndexGroups'
import { indexGroupsStorageKey } from '../services/persistence/indexSettingsSchemaVersion'
import { saveIndexGroups } from '../services/persistence/saveIndexGroups'
import { fetchTencentMarketStatus } from '../services/tencent/fetchTencentMarketStatus'
import { selectActiveIndexDefinitions } from './selectActiveIndexDefinitions'
import { selectOpenMarketIndexDefinitions } from './selectOpenMarketIndexDefinitions'

export interface IndexPollingConfiguration {
  readonly enabled: boolean
  readonly intervalMs: number
}

const defaultPollingConfiguration: IndexPollingConfiguration = {
  enabled: true,
  intervalMs: 10_000,
}

export const useIndexQuotesStore = defineStore('index-quotes', () => {
  const definitions = shallowRef<readonly IndexDefinition[]>(defaultIndexDefinitions)
  const groups = shallowRef<readonly IndexGroupDefinition[]>(loadIndexGroups())
  const activeDefinitions = shallowRef(
    selectActiveIndexDefinitions(definitions.value, groups.value),
  )
  const quotesByIndexId = shallowRef<Readonly<Record<string, IndexQuoteSnapshot>>>({})
  const isRefreshing = ref(false)
  const health = ref<IndexQuoteHealth>('unknown')
  const issues = shallowRef<readonly IndexQuoteIssue[]>([])
  const lastSuccessfulAt = ref<number>()

  let activeRequest: AbortController | undefined
  let activeRefresh: Promise<void> | undefined
  let lifecycle = 0
  let polling = false
  let refreshTimer: ReturnType<typeof setInterval> | undefined
  let pollingConfiguration = defaultPollingConfiguration

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange)
    onScopeDispose(() => window.removeEventListener('storage', handleStorageChange))
  }

  function refresh(): Promise<void> {
    return runRefresh((signal) => fetchEastmoneyIndexQuotes(activeDefinitions.value, signal))
  }

  function refreshOpenMarkets(): Promise<void> {
    return runRefresh(async (signal) => {
      let openMarkets
      try {
        openMarkets = await fetchTencentMarketStatus(signal)
      } catch (error) {
        if (isAbortError(error)) {
          throw error
        }
        throw new MarketStatusRequestError()
      }

      const openDefinitions = selectOpenMarketIndexDefinitions(activeDefinitions.value, openMarkets)
      if (openDefinitions.length === 0) {
        return 'markets-closed'
      }

      return fetchEastmoneyIndexQuotes(openDefinitions, signal)
    })
  }

  function runRefresh(
    loadBatch: (signal: AbortSignal) => Promise<IndexQuoteBatch | 'markets-closed'>,
  ): Promise<void> {
    if (activeRefresh) {
      return activeRefresh
    }

    const currentLifecycle = lifecycle
    const controller = new AbortController()
    activeRequest = controller
    isRefreshing.value = true

    const request = loadBatch(controller.signal)
      .then((batch) => {
        if (currentLifecycle !== lifecycle) {
          return
        }

        if (batch === 'markets-closed') {
          const remainingIssues = issues.value.filter(
            (issue) => issue.code !== 'market-status-failed',
          )
          issues.value = remainingIssues
          if (Object.keys(quotesByIndexId.value).length > 0) {
            health.value = remainingIssues.length === 0 ? 'healthy' : 'partial'
          }
          return
        }

        applyBatch(batch)
      })
      .catch((error: unknown) => {
        if (currentLifecycle !== lifecycle || isAbortError(error)) {
          return
        }

        health.value = Object.keys(quotesByIndexId.value).length === 0 ? 'failed' : 'partial'
        issues.value = [
          {
            code:
              error instanceof MarketStatusRequestError ? 'market-status-failed' : 'request-failed',
            indexId: 'batch',
          },
        ]
      })
      .finally(() => {
        if (activeRefresh === request) {
          activeRefresh = undefined
          activeRequest = undefined
          isRefreshing.value = false
        }
      })

    activeRefresh = request
    return request
  }

  function applyBatch(batch: IndexQuoteBatch): void {
    issues.value = batch.issues
    if (batch.quotes.length === 0) {
      health.value = 'failed'
      return
    }

    const nextQuotes = { ...quotesByIndexId.value }
    for (const quote of batch.quotes) {
      nextQuotes[quote.indexId] = quote
    }

    quotesByIndexId.value = nextQuotes
    lastSuccessfulAt.value = batch.fetchedAt
    health.value = batch.issues.length === 0 ? 'healthy' : 'partial'
  }

  function replaceGroups(newGroups: readonly IndexGroupDefinition[]): void {
    groups.value = newGroups
    activeDefinitions.value = selectActiveIndexDefinitions(definitions.value, newGroups)
    lifecycle += 1
    activeRequest?.abort()
    activeRequest = undefined
    activeRefresh = undefined
    isRefreshing.value = false

    if (polling && typeof document !== 'undefined' && !document.hidden) {
      void refresh()
    }
  }

  function getSettingsSnapshot(): readonly IndexGroupDefinition[] {
    return cloneGroups(groups.value)
  }

  const settingsCommands = createIndexSettingsCommandModule({
    apply: replaceGroups,
    knownQuoteCodes: new Set(definitions.value.map(({ quoteCode }) => quoteCode)),
    persist: saveIndexGroups,
  })

  function commitGroups(newGroups: readonly IndexGroupDefinition[]): CommitIndexGroupsResult {
    return settingsCommands.commitReplace(newGroups)
  }

  function syncFromStorage(): void {
    const storedGroups = loadIndexGroups()
    if (!areGroupsEqual(groups.value, storedGroups)) {
      replaceGroups(storedGroups)
    }
  }

  function handleStorageChange(event: StorageEvent): void {
    if (event.key === indexGroupsStorageKey && event.newValue !== null) {
      syncFromStorage()
    }
  }

  function startPolling(): void {
    if (polling || typeof document === 'undefined') {
      return
    }

    polling = true
    document.addEventListener('visibilitychange', handleVisibilityChange)
    handleVisibilityChange()
  }

  function setPollingConfiguration(configuration: IndexPollingConfiguration): void {
    pollingConfiguration = { ...configuration }
    if (!polling || typeof document === 'undefined') {
      return
    }

    clearRefreshTimer()
    if (document.hidden || !pollingConfiguration.enabled) {
      return
    }

    refreshWhenCurrentRequestSettles()
    refreshTimer = setInterval(() => void refreshOpenMarkets(), pollingConfiguration.intervalMs)
  }

  function stopPolling(): void {
    if (!polling) {
      return
    }

    polling = false
    lifecycle += 1
    clearRefreshTimer()
    activeRequest?.abort()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  function handleVisibilityChange(): void {
    clearRefreshTimer()

    if (!polling || document.hidden) {
      activeRequest?.abort()
      return
    }

    if (!pollingConfiguration.enabled) return
    refreshTimer = setInterval(() => void refreshOpenMarkets(), pollingConfiguration.intervalMs)
  }

  function refreshWhenCurrentRequestSettles(): void {
    const refreshVisibleQuotes = () =>
      Object.keys(quotesByIndexId.value).length === 0 ? refresh() : refreshOpenMarkets()
    const pendingRefresh = activeRefresh
    if (!pendingRefresh) {
      void refreshVisibleQuotes()
      return
    }

    void pendingRefresh.then(() => {
      if (polling && !document.hidden) {
        void refreshVisibleQuotes()
      }
    })
  }

  function clearRefreshTimer(): void {
    if (refreshTimer !== undefined) {
      clearInterval(refreshTimer)
      refreshTimer = undefined
    }
  }

  function cloneGroups(groupsToClone: readonly IndexGroupDefinition[]): IndexGroupDefinition[] {
    return groupsToClone.map((group) => ({
      id: group.id,
      name: group.name,
      quoteCodes: [...group.quoteCodes],
    }))
  }

  return {
    definitions,
    getSettingsSnapshot,
    groups,
    health,
    isRefreshing,
    issues,
    lastSuccessfulAt,
    quotesByIndexId,
    refresh,
    commitGroups,
    setPollingConfiguration,
    startPolling,
    stopPolling,
  }
})

class MarketStatusRequestError extends Error {}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function areGroupsEqual(
  first: readonly IndexGroupDefinition[],
  second: readonly IndexGroupDefinition[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (group, index) =>
        group.id === second[index]?.id &&
        group.name === second[index]?.name &&
        group.quoteCodes.length === second[index]?.quoteCodes.length &&
        group.quoteCodes.every(
          (quoteCode, quoteCodeIndex) => quoteCode === second[index]?.quoteCodes[quoteCodeIndex],
        ),
    )
  )
}
