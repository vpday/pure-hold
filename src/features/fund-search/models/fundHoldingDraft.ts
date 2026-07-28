import type { FundAddition } from '../../../domains/funds/models/fundAddition.ts'
import type { FundSearchItem } from '../../../domains/funds/models/fundSearch.ts'
import {
  createEmptyFundHoldingDraft,
  type FundHoldingDraft as HoldingFieldsDraft,
  type FundHoldingDraftErrors,
  validateFundHoldingDraft,
} from '../../fund-holding-form/models/fundHoldingDraft.ts'

export interface FundHoldingDraft {
  readonly code: string
  holding: HoldingFieldsDraft
  readonly name: string
}

export type { FundHoldingDraftErrors }

export function createFundHoldingDrafts(
  funds: readonly FundSearchItem[],
): readonly FundHoldingDraft[] {
  return funds.map(({ code, name }) => ({
    code,
    holding: createEmptyFundHoldingDraft(),
    name,
  }))
}

export function validateFundHoldingDrafts(
  drafts: readonly FundHoldingDraft[],
  today = new Date(),
):
  | { additions: readonly FundAddition[]; errors: Readonly<Record<string, never>> }
  | { additions?: undefined; errors: Readonly<Record<string, FundHoldingDraftErrors>> } {
  const errors: Record<string, FundHoldingDraftErrors> = {}
  const additions = drafts.flatMap((draft) => {
    const result = validateFundHoldingDraft(draft.code, draft.holding, today)
    if (!result.holding) {
      errors[draft.code] = result.errors
      return []
    }
    return [
      {
        code: draft.code,
        holding: result.holding,
        name: draft.name,
      },
    ]
  })

  return Object.keys(errors).length > 0 ? { errors } : { additions, errors: {} }
}
