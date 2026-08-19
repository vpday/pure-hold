import { computed, ref } from 'vue'

import type { FundAddition } from '@/domains/funds/models/fundAddition'
import type { FundHolding } from '@/domains/funds/models/fundHolding'
import {
  createFundHoldingDrafts,
  type FundHoldingDraft,
  type FundHoldingDraftErrors,
  validateFundHoldingDrafts,
} from '../models/fundHoldingDraft'
import type { FundAdditionSessionModel, FundAdditionStep } from '../models/fundAdditionSessionModel'
import { useFundSearch } from './useFundSearch'

type AddFunds = (additions: readonly FundAddition[]) => { error?: string }
export type EnsureFundLedger = (fundCode: string) => {
  readonly error?: unknown
  readonly ok: boolean
  readonly retryable?: boolean
}

export function useFundAdditionSession(addFunds: AddFunds, ensureFundLedger?: EnsureFundLedger) {
  const existingCodes = new Set<string>()
  const search = useFundSearch(existingCodes)
  const step = ref<FundAdditionStep>('search')
  const holdingDrafts = ref<FundHoldingDraft[]>([])
  const holdingErrors = ref<Readonly<Record<string, FundHoldingDraftErrors>>>({})
  const pendingLedgerRetries = ref<readonly string[]>([])
  const submitError = ref('')
  const transientSubmitError = ref('')

  const model = computed<FundAdditionSessionModel>(() => ({
    actions:
      step.value === 'search'
        ? {
            canSubmit: search.selected.value.length > 0,
            step: 'search',
          }
        : {
            count: search.selected.value.length,
            retryLedgerAvailable: pendingLedgerRetries.value.length > 0,
            step: 'holdings',
          },
    content:
      step.value === 'search'
        ? {
            search: {
              error: search.error.value,
              existingCodes,
              hasMore: search.hasMore.value,
              isLoading: search.isLoading.value,
              items: search.items.value,
              keyword: search.keyword.value,
              selected: search.selected.value,
              selectedExpanded: search.selectedExpanded.value,
            },
            step: 'search',
            submitError: submitError.value,
          }
        : {
            holdings: {
              drafts: holdingDrafts.value,
              errors: holdingErrors.value,
            },
            step: 'holdings',
            submitError: submitError.value,
          },
    step: step.value,
  }))

  function open(codes: Iterable<string>): void {
    reset()
    for (const code of codes) existingCodes.add(code)
  }

  function reset(): void {
    existingCodes.clear()
    search.reset()
    step.value = 'search'
    holdingDrafts.value = []
    holdingErrors.value = {}
    pendingLedgerRetries.value = []
    submitError.value = ''
    transientSubmitError.value = ''
  }

  function toggleSelectedPanel(): void {
    search.selectedExpanded.value = !search.selectedExpanded.value
  }

  function enterHoldings(): void {
    holdingDrafts.value = createFundHoldingDrafts(search.selected.value).map((draft) => ({
      ...draft,
    }))
    holdingErrors.value = {}
    submitError.value = ''
    step.value = 'holdings'
  }

  function backToSearch(): void {
    step.value = 'search'
  }

  function addWithoutHoldings(): number | undefined {
    transientSubmitError.value = ''
    return submit(
      search.selected.value.map(({ code, name }) => ({
        code,
        name,
      })),
    )
  }

  function confirmHoldings(): number | undefined {
    transientSubmitError.value = ''
    const result = validateFundHoldingDrafts(holdingDrafts.value)
    holdingErrors.value = result.errors
    return result.additions ? submit(result.additions) : undefined
  }

  function submit(additions: readonly FundAddition[]): number | undefined {
    const result = addFunds(additions)
    if (result.error) {
      transientSubmitError.value = result.error
      return undefined
    }

    const failedLedgerCodes = ensureFundLedger
      ? additions
          .filter((addition): addition is FundAddition & { readonly holding: FundHolding } => {
            return addition.holding !== undefined
          })
          .flatMap(({ code }) => {
            const ledgerResult = ensureFundLedger(code)
            return ledgerResult.ok ? [] : [code]
          })
      : []
    if (failedLedgerCodes.length > 0) {
      pendingLedgerRetries.value = failedLedgerCodes
      submitError.value = '基金设置已保存，但投资账本自动建立失败，请重试。'
      return undefined
    }

    pendingLedgerRetries.value = []
    return additions.length
  }

  function retryLedger(): number | undefined {
    if (!ensureFundLedger || pendingLedgerRetries.value.length === 0) return undefined
    const retryCodes = pendingLedgerRetries.value
    const failedCodes = retryCodes.filter((code) => !ensureFundLedger(code).ok)
    if (failedCodes.length > 0) {
      pendingLedgerRetries.value = failedCodes
      submitError.value = '投资账本自动建立仍未完成，请稍后重试。'
      return undefined
    }
    pendingLedgerRetries.value = []
    submitError.value = ''
    return retryCodes.length
  }

  function takeTransientSubmitError(): string | undefined {
    const error = transientSubmitError.value || undefined
    transientSubmitError.value = ''
    return error
  }

  return {
    addWithoutHoldings,
    backToSearch,
    confirmHoldings,
    enterHoldings,
    loadMore: search.loadMore,
    model,
    open,
    removeSelection: search.removeSelection,
    reset,
    retryLedger,
    retry: search.retry,
    setKeyword: search.setKeyword,
    takeTransientSubmitError,
    toggleSelectedPanel,
    toggleSelection: search.toggleSelection,
  }
}
