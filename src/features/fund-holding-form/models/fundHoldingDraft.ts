import type { FundDividendMode, FundHolding } from '@/domains/funds/models/fundHolding.ts'

export type FundHoldingTimeMode = 'date' | 'days'

export interface FundHoldingDraft {
  costPrice: string
  dividendMode: FundDividendMode | ''
  holdingDays: string
  purchaseDate: string
  timeMode: FundHoldingTimeMode
  units: string
}

export interface FundHoldingDraftErrors {
  readonly costPrice?: string
  readonly dividendMode?: string
  readonly time?: string
  readonly units?: string
}

export function createEmptyFundHoldingDraft(): FundHoldingDraft {
  return {
    costPrice: '',
    dividendMode: '',
    holdingDays: '',
    purchaseDate: '',
    timeMode: 'date',
    units: '',
  }
}

export function createFundHoldingDraft(holding: FundHolding): FundHoldingDraft {
  return {
    costPrice: String(holding.costPrice),
    dividendMode: holding.dividendMode,
    holdingDays: '',
    purchaseDate: holding.purchaseDate,
    timeMode: 'date',
    units: String(holding.units),
  }
}

export function validateFundHoldingDraft(
  code: string,
  draft: FundHoldingDraft,
  today = new Date(),
):
  | { errors: FundHoldingDraftErrors; holding?: undefined }
  | { errors: Readonly<Record<string, never>>; holding: FundHolding } {
  const errors: {
    costPrice?: string
    dividendMode?: string
    time?: string
    units?: string
  } = {}
  const units = parsePositiveDecimal(draft.units)
  const costPrice = parsePositiveDecimal(draft.costPrice)
  if (units === undefined) errors.units = '请输入大于 0、最多 4 位小数的份额'
  if (costPrice === undefined) errors.costPrice = '请输入大于 0、最多 4 位小数的成本价'
  if (draft.dividendMode !== 'cash' && draft.dividendMode !== 'reinvest') {
    errors.dividendMode = '请选择分红方式'
  }

  const purchaseDate =
    draft.timeMode === 'date'
      ? validatePurchaseDate(draft.purchaseDate, today)
      : purchaseDateFromHoldingDays(draft.holdingDays, today)
  if (!purchaseDate) {
    errors.time =
      draft.timeMode === 'date' ? '请选择不晚于今天且非周末的购买日期' : '请输入正整数持仓天数'
  }

  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors: {},
    holding: {
      code,
      costPrice: costPrice!,
      dividendMode: draft.dividendMode as FundDividendMode,
      purchaseDate: purchaseDate!,
      units: units!,
    },
  }
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
  if (date > localToday || [0, 6].includes(date.getDay())) return undefined
  return value
}

function formatLocalDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
