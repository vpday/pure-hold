import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

import { defaultIndexDefinitions } from '../config/defaultIndexDefinitions'
import { defaultIndexGroups } from '../config/defaultIndexGroups'
import type { IndexDefinition } from '../models/indexDefinition'
import type { IndexQuoteBatch, IndexQuoteHealth, IndexQuoteSnapshot } from '../models/indexQuote'
import type { IndexQuoteIssue } from '../models/indexQuoteIssue'
import { fetchEastmoneyIndexQuotes } from '../services/eastmoney/fetchEastmoneyIndexQuotes'
import { fetchTencentMarketStatus } from '../services/tencent/fetchTencentMarketStatus'
import { selectActiveIndexDefinitions } from './selectActiveIndexDefinitions'
import { selectOpenMarketIndexDefinitions } from './selectOpenMarketIndexDefinitions'

const refreshInterval = 10_000

export const useIndexQuotesStore = defineStore('index-quotes', () => {
  const definitions = shallowRef<readonly IndexDefinition[]>(defaultIndexDefinitions)
  const groups = shallowRef(defaultIndexGroups)
  const activeDefinitions = selectActiveIndexDefinitions(definitions.value, groups.value)
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

  function refresh(): Promise<void> {
    return runRefresh((signal) => fetchEastmoneyIndexQuotes(activeDefinitions, signal))
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

      const openDefinitions = selectOpenMarketIndexDefinitions(activeDefinitions, openMarkets)
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

  function startPolling(): void {
    if (polling || typeof document === 'undefined') {
      return
    }

    polling = true
    document.addEventListener('visibilitychange', handleVisibilityChange)
    handleVisibilityChange()
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

    refreshWhenCurrentRequestSettles()
    refreshTimer = setInterval(() => void refreshOpenMarkets(), refreshInterval)
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

  return {
    definitions,
    groups,
    health,
    isRefreshing,
    issues,
    lastSuccessfulAt,
    quotesByIndexId,
    refresh,
    startPolling,
    stopPolling,
  }
})

class MarketStatusRequestError extends Error {}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
