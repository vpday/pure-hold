import { computed, onScopeDispose, ref, shallowRef } from 'vue'

import type { FundSearchItem, FundSearchPage } from '../../../domains/funds/models/fundSearch.ts'
import { fetchEastmoneyFundSearchPage } from '../../../domains/funds/services/eastmoney/fetchEastmoneyFundSearchPage.ts'
import { removeFundSelection, toggleFundSelection } from '../models/fundSelectionDraft.ts'

type SearchFundPage = (
  query: string,
  pageIndex: number,
  signal?: AbortSignal,
) => Promise<FundSearchPage>

export function useFundSearch(
  existingCodes: ReadonlySet<string>,
  search: SearchFundPage = fetchEastmoneyFundSearchPage,
) {
  const keyword = ref('')
  const items = shallowRef<readonly FundSearchItem[]>([])
  const pageIndex = ref(0)
  const totalCount = ref(0)
  const isLoading = ref(false)
  const error = ref('')
  const selected = shallowRef<readonly FundSearchItem[]>([])
  const selectedExpanded = ref(false)
  const hasMore = computed(() => pageIndex.value * 20 < totalCount.value)

  let timer: ReturnType<typeof setTimeout> | undefined
  let activeController: AbortController | undefined
  let requestGeneration = 0
  let failedPage = 1
  let failedAppend = false

  function setKeyword(value: string): void {
    keyword.value = value
    clearTimerAndRequest()
    requestGeneration += 1
    items.value = []
    pageIndex.value = 0
    totalCount.value = 0
    error.value = ''
    const query = value.trim()
    if (query.length < 1) {
      isLoading.value = false
      return
    }
    timer = setTimeout(() => {
      timer = undefined
      void requestPage(1, false)
    }, 300)
  }

  function loadMore(): void {
    if (!hasMore.value || isLoading.value || error.value) return
    void requestPage(pageIndex.value + 1, true)
  }

  function retry(): void {
    if (isLoading.value || keyword.value.trim().length < 1) return
    void requestPage(failedPage, failedAppend)
  }

  function toggleSelection(item: FundSearchItem): void {
    if (existingCodes.has(item.code)) return
    selected.value = toggleFundSelection(selected.value, item)
    if (selected.value.length === 0) selectedExpanded.value = false
  }

  function removeSelection(code: string): void {
    selected.value = removeFundSelection(selected.value, code)
    if (selected.value.length === 0) selectedExpanded.value = false
  }

  function reset(): void {
    clearTimerAndRequest()
    requestGeneration += 1
    keyword.value = ''
    items.value = []
    pageIndex.value = 0
    totalCount.value = 0
    isLoading.value = false
    error.value = ''
    selected.value = []
    selectedExpanded.value = false
    failedPage = 1
    failedAppend = false
  }

  async function requestPage(nextPage: number, append: boolean): Promise<void> {
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    const generation = ++requestGeneration
    const query = keyword.value.trim()
    isLoading.value = true
    error.value = ''
    try {
      const page = await search(query, nextPage, controller.signal)
      if (generation !== requestGeneration) return
      items.value = append ? appendUnique(items.value, page.items) : page.items
      pageIndex.value = page.pageIndex
      totalCount.value = page.totalCount
    } catch (requestError) {
      if (generation !== requestGeneration || isAbortError(requestError)) return
      error.value = '搜索失败，请稍后重试'
      failedPage = nextPage
      failedAppend = append
    } finally {
      if (generation === requestGeneration) {
        isLoading.value = false
        activeController = undefined
      }
    }
  }

  function clearTimerAndRequest(): void {
    if (timer) clearTimeout(timer)
    timer = undefined
    activeController?.abort()
    activeController = undefined
  }

  onScopeDispose(reset)

  return {
    error,
    hasMore,
    isLoading,
    items,
    keyword,
    loadMore,
    removeSelection,
    reset,
    retry,
    selected,
    selectedExpanded,
    setKeyword,
    toggleSelection,
  }
}

function appendUnique(
  current: readonly FundSearchItem[],
  next: readonly FundSearchItem[],
): readonly FundSearchItem[] {
  const seen = new Set(current.map(({ code }) => code))
  return [...current, ...next.filter(({ code }) => !seen.has(code) && seen.add(code))]
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
