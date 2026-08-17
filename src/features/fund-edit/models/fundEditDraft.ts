import type { FundGroupDefinition } from '@/domains/funds/models/fundGroupDefinition.ts'
import type { FundHolding } from '@/domains/funds/models/fundHolding.ts'
import {
  createEmptyFundHoldingDraft,
  createFundHoldingDraft,
  type FundHoldingDraft,
  type FundHoldingDraftErrors,
  validateFundHoldingDraft,
} from '../../fund-holding-form/models/fundHoldingDraft.ts'

export interface FundEditDraft {
  readonly code: string
  readonly name: string
  holding: FundHoldingDraft
  selectedGroupIds: string[]
}

export type EnsureFundLedger = (fundCode: string) => {
  readonly error?: unknown
  readonly ok: boolean
  readonly retryable?: boolean
}

export interface FundEditSubmitters {
  updateFundGroupMembership(code: string, selectedGroupIds: ReadonlySet<string>): { error?: string }
  updateFundHolding(holding: FundHolding): { error?: string }
  ensureFundLedger?: EnsureFundLedger
}

export interface FundEditSubmitResult {
  readonly error?: string
  readonly fieldErrors: FundHoldingDraftErrors
  readonly holdingSaved?: boolean
  readonly reason?: 'ledger-persistence-failed'
  readonly retryable?: boolean
  readonly success: boolean
}

export function createFundEditDraft(
  code: string,
  name: string,
  holding: FundHolding | undefined,
  groups: readonly FundGroupDefinition[],
): FundEditDraft {
  return {
    code,
    holding: holding ? createFundHoldingDraft(holding) : createEmptyFundHoldingDraft(),
    name,
    selectedGroupIds: groups
      .filter(({ fundCodes }) => fundCodes.includes(code))
      .map(({ id }) => id),
  }
}

export function submitFundEditDraft(
  draft: FundEditDraft,
  submitters: FundEditSubmitters,
  today = new Date(),
): FundEditSubmitResult {
  let holdingSaved = false
  if (!isFundHoldingDraftEmpty(draft.holding)) {
    const validation = validateFundHoldingDraft(draft.code, draft.holding, today)
    if (!validation.holding) {
      return { fieldErrors: validation.errors, success: false }
    }

    const holdingResult = submitters.updateFundHolding(validation.holding)
    if (holdingResult.error) {
      return { error: holdingResult.error, fieldErrors: {}, success: false }
    }
    holdingSaved = true

    const ledgerResult = submitters.ensureFundLedger?.(validation.holding.code)
    if (ledgerResult && !ledgerResult.ok) {
      return {
        error: '持仓信息已保存，但投资账本自动建立失败，请重试',
        fieldErrors: {},
        holdingSaved: true,
        reason: 'ledger-persistence-failed',
        retryable: ledgerResult.retryable !== false,
        success: false,
      }
    }
  }

  const groupResult = submitters.updateFundGroupMembership(
    draft.code,
    new Set(draft.selectedGroupIds),
  )
  if (groupResult.error) {
    return {
      error: holdingSaved ? '持仓信息已保存，基金分组保存失败' : groupResult.error,
      fieldErrors: {},
      success: false,
    }
  }
  return { fieldErrors: {}, success: true }
}

function isFundHoldingDraftEmpty(draft: FundHoldingDraft): boolean {
  return (
    String(draft.units).trim() === '' &&
    String(draft.costPrice).trim() === '' &&
    draft.dividendMode === '' &&
    String(draft.purchaseDate).trim() === '' &&
    String(draft.holdingDays).trim() === ''
  )
}
