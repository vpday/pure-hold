import type { FundAddition } from '../../../domains/funds/models/fundAddition.ts'
import type { FundSearchItem } from '../../../domains/funds/models/fundSearch.ts'

export type FundHoldingTimeMode = 'date' | 'days'

export interface FundHoldingDraft {
  readonly code: string
  costPrice: string
  holdingDays: string
  readonly name: string
  purchaseDate: string
  timeMode: FundHoldingTimeMode
  units: string
}

export interface FundHoldingDraftErrors {
  readonly costPrice?: string
  readonly time?: string
  readonly units?: string
}

export function createFundHoldingDrafts(
  funds: readonly FundSearchItem[],
): readonly FundHoldingDraft[] {
  return funds.map(({ code, name }) => ({
    code,
    costPrice: '',
    holdingDays: '',
    name,
    purchaseDate: '',
    timeMode: 'date',
    units: '',
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
    const draftErrors: {
      costPrice?: string
      time?: string
      units?: string
    } = {}
    const units = parsePositiveDecimal(draft.units)
    const costPrice = parsePositiveDecimal(draft.costPrice)
    if (units === undefined) draftErrors.units = '请输入大于 0、最多 4 位小数的份额'
    if (costPrice === undefined) draftErrors.costPrice = '请输入大于 0、最多 4 位小数的成本价'

    const purchaseDate =
      draft.timeMode === 'date'
        ? validatePurchaseDate(draft.purchaseDate, today)
        : purchaseDateFromHoldingDays(draft.holdingDays, today)
    if (!purchaseDate) {
      draftErrors.time =
        draft.timeMode === 'date' ? '请选择不晚于今天的购买日期' : '请输入正整数持仓天数'
    }

    if (Object.keys(draftErrors).length > 0) {
      errors[draft.code] = draftErrors
      return []
    }
    return [
      {
        code: draft.code,
        holding: {
          code: draft.code,
          costPrice: costPrice!,
          purchaseDate: purchaseDate!,
          units: units!,
        },
        name: draft.name,
      },
    ]
  })

  return Object.keys(errors).length > 0 ? { errors } : { additions, errors: {} }
}

export function purchaseDateFromHoldingDays(days: string, today = new Date()): string | undefined {
  if (!/^[1-9]\d*$/.test(days)) return undefined
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  date.setDate(date.getDate() - Number(days))
  return formatLocalDate(date)
}

function parsePositiveDecimal(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,4})?$/.test(value)) return undefined
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function validatePurchaseDate(value: string, today: Date): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return undefined
  }
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return date <= localToday ? value : undefined
}

function formatLocalDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
