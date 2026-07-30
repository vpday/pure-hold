import type { FundSearchItem } from '@/domains/funds/models/fundSearch'
import type { FundHoldingDraft, FundHoldingDraftErrors } from './fundHoldingDraft'

export type FundAdditionStep = 'holdings' | 'search'

export type FundAdditionContentModel =
  | {
      readonly search: {
        readonly error: string
        readonly existingCodes: ReadonlySet<string>
        readonly hasMore: boolean
        readonly isLoading: boolean
        readonly items: readonly FundSearchItem[]
        readonly keyword: string
        readonly selected: readonly FundSearchItem[]
        readonly selectedExpanded: boolean
      }
      readonly step: 'search'
      readonly submitError: string
    }
  | {
      readonly holdings: {
        readonly drafts: FundHoldingDraft[]
        readonly errors: Readonly<Record<string, FundHoldingDraftErrors>>
      }
      readonly step: 'holdings'
      readonly submitError: string
    }

export type FundAdditionActionsModel =
  | {
      readonly canSubmit: boolean
      readonly step: 'search'
    }
  | {
      readonly count: number
      readonly step: 'holdings'
    }

export interface FundAdditionSessionModel {
  readonly actions: FundAdditionActionsModel
  readonly content: FundAdditionContentModel
  readonly step: FundAdditionStep
}
