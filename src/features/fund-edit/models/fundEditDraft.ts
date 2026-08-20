import type {
  PortfolioCoordinationStatus,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import type { CoordinationFailureFact } from '@/app/coordination/coordinationFailure.ts'
import type { FundGroupDefinition } from '@/domains/funds/models/fundGroupDefinition.ts'
import type { FundHolding } from '@/domains/funds/models/fundHolding.ts'
import type { PortfolioEvent } from '@/domains/portfolio/models/portfolio.ts'
import {
  createEmptyFundHoldingDraft,
  createFundHoldingDraft,
  type FundHoldingDraft,
  type FundHoldingDraftErrors,
  validateFundHoldingMetadataDraft,
  validateFundHoldingDraft,
} from '../../fund-holding-form/models/fundHoldingDraft.ts'

export interface FundEditDraft {
  readonly code: string
  readonly name: string
  holding: FundHoldingDraft
  selectedGroupIds: string[]
}

export type EnsureFundLedger = (fundCode: string) => {
  readonly failure?: CoordinationFailureFact
  readonly ok: boolean
  readonly retryable?: boolean
}

export interface FundEditSubmitters {
  updateFundGroupMembership(code: string, selectedGroupIds: ReadonlySet<string>): { error?: string }
  updateFundHolding(holding: FundHolding): { error?: string }
  updateHoldingMetadata?: Pick<
    PortfolioCoordinator,
    'updateHoldingMetadata'
  >['updateHoldingMetadata']
  ensureFundLedger?: EnsureFundLedger
  holdingFactsReadonly?: boolean
}

export interface FundEditSubmitResult {
  readonly error?: string
  readonly failure?: CoordinationFailureFact
  readonly fieldErrors: FundHoldingDraftErrors
  readonly holdingSaved?: boolean
  readonly reason?: 'ledger-persistence-failed'
  readonly retryable?: boolean
  readonly status?: PortfolioCoordinationStatus
  readonly success: boolean
}

export function createFundEditDraft(
  code: string,
  name: string,
  holding: FundHolding | undefined,
  groups: readonly FundGroupDefinition[],
  currentNav: number | null = null,
): FundEditDraft {
  return {
    code,
    holding: holding ? createFundHoldingDraft(holding, currentNav) : createEmptyFundHoldingDraft(),
    name,
    selectedGroupIds: groups
      .filter(({ fundCodes }) => fundCodes.includes(code))
      .map(({ id }) => id),
  }
}

export function hasSubsequentFundEvents(
  events: readonly Pick<PortfolioEvent, 'fundCode' | 'kind'>[],
  fundCode: string,
): boolean {
  return events.some((event) => event.fundCode === fundCode && event.kind !== 'initial-holding')
}

export function submitFundEditDraft(
  draft: FundEditDraft,
  submitters: FundEditSubmitters,
  today = new Date(),
): FundEditSubmitResult {
  let holdingSaved = false
  if (submitters.holdingFactsReadonly) {
    const validation = validateFundHoldingMetadataDraft(draft.code, draft.holding, today)
    if (!validation.metadata) return { fieldErrors: validation.errors, success: false }
    if (!submitters.updateHoldingMetadata) {
      return {
        error: '基金元数据保存入口不可用，请重试',
        fieldErrors: {},
        retryable: true,
        success: false,
      }
    }
    const metadataResult = submitters.updateHoldingMetadata(validation.metadata)
    if (isBlockingCoordinationStatus(metadataResult.status)) {
      return {
        error: '基金元数据保存失败，请重试',
        fieldErrors: {},
        retryable: metadataResult.retryable,
        status: metadataResult.status,
        success: false,
      }
    }
    const groupResult = submitters.updateFundGroupMembership(
      draft.code,
      new Set(draft.selectedGroupIds),
    )
    if (groupResult.error) {
      return {
        error: groupResult.error,
        fieldErrors: {},
        status: metadataResult.status,
        success: false,
      }
    }
    return { fieldErrors: {}, status: metadataResult.status, success: true }
  }

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
        error:
          ledgerResult.failure?.persistence === 'partial'
            ? '持仓信息已保存，但投资账本可能已部分持久化，请重试并检查账本'
            : '持仓信息已保存，但投资账本自动建立失败，请重试',
        fieldErrors: {},
        ...(ledgerResult.failure === undefined ? {} : { failure: ledgerResult.failure }),
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
      ...(holdingSaved ? { holdingSaved: true } : {}),
      success: false,
    }
  }
  return { fieldErrors: {}, success: true }
}

function isFundHoldingDraftEmpty(draft: FundHoldingDraft): boolean {
  return (
    String(draft.units).trim() === '' &&
    String(draft.holdingAmountYuan).trim() === '' &&
    String(draft.holdingIncomeYuan).trim() === '' &&
    String(draft.purchaseDate).trim() === '' &&
    String(draft.holdingDays).trim() === ''
  )
}

function isBlockingCoordinationStatus(status: PortfolioCoordinationStatus): boolean {
  return (
    status === 'ledger-error' ||
    status === 'portfolio-persistence-failed' ||
    status === 'holding-sync-failed'
  )
}
