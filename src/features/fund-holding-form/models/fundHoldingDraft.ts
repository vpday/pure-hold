import {
  createFundHolding,
  holdingTotalCostCents,
  type FundDividendMode,
  type FundHolding,
} from '@/domains/funds/models/fundHolding.ts'

export type FundHoldingTimeMode = 'date' | 'days'

export interface FundHoldingDraft {
  dividendMode: FundDividendMode | ''
  holdingDays: string
  purchaseDate: string
  totalCostYuan: string
  timeMode: FundHoldingTimeMode
  units: string
}

export interface FundHoldingDraftErrors {
  readonly dividendMode?: string
  readonly time?: string
  readonly totalCostYuan?: string
  readonly units?: string
}

export interface FundHoldingMetadata {
  readonly code: string
  readonly dividendMode: FundDividendMode
  readonly purchaseDate: string
}

export function createEmptyFundHoldingDraft(): FundHoldingDraft {
  return {
    dividendMode: 'cash',
    holdingDays: '',
    purchaseDate: '',
    totalCostYuan: '',
    timeMode: 'date',
    units: '',
  }
}

export function createFundHoldingDraft(holding: FundHolding): FundHoldingDraft {
  const totalCostCents = holdingTotalCostCents(holding)
  return {
    dividendMode: holding.dividendMode,
    holdingDays: '',
    purchaseDate: holding.purchaseDate,
    totalCostYuan: totalCostCents === null ? '' : String(totalCostCents / 100),
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
    dividendMode?: string
    time?: string
    totalCostYuan?: string
    units?: string
  } = {}
  const units = parsePositiveDecimal(draft.units, 4)
  const totalCostCents = parsePositiveMoney(draft.totalCostYuan)
  if (units === undefined) errors.units = '请输入大于 0、最多 4 位小数的份额'
  if (totalCostCents === undefined) {
    errors.totalCostYuan = '请输入大于 0、最多 2 位小数的总成本'
  }
  const dividendMode = validateDividendMode(draft.dividendMode, errors)
  const purchaseDate = resolvePurchaseDate(draft, today, errors)

  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors: {},
    holding: createFundHolding({
      code,
      dividendMode: dividendMode!,
      purchaseDate: purchaseDate!,
      totalCostCents: totalCostCents!,
      units: units!,
    }),
  }
}

export function validateFundHoldingMetadataDraft(
  code: string,
  draft: FundHoldingDraft,
  today = new Date(),
):
  | { errors: FundHoldingDraftErrors; metadata?: undefined }
  | { errors: Readonly<Record<string, never>>; metadata: FundHoldingMetadata } {
  const errors: FundHoldingDraftErrors = {}
  const dividendMode = validateDividendMode(draft.dividendMode, errors)
  const purchaseDate = resolvePurchaseDate(draft, today, errors)
  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors: {},
    metadata: {
      code,
      dividendMode: dividendMode!,
      purchaseDate: purchaseDate!,
    },
  }
}

function validateDividendMode(
  value: FundHoldingDraft['dividendMode'],
  errors: { dividendMode?: string },
): FundDividendMode | undefined {
  if (value !== 'cash' && value !== 'reinvest') {
    errors.dividendMode = '请选择分红方式'
    return undefined
  }
  return value
}

function resolvePurchaseDate(
  draft: FundHoldingDraft,
  today: Date,
  errors: { time?: string },
): string | undefined {
  const purchaseDate =
    draft.timeMode === 'date'
      ? validatePurchaseDate(draft.purchaseDate, today)
      : purchaseDateFromHoldingDays(draft.holdingDays, today)
  if (!purchaseDate) {
    errors.time =
      draft.timeMode === 'date' ? '请选择不晚于今天且非周末的购买日期' : '请输入正整数持仓天数'
  }
  return purchaseDate
}

export function purchaseDateFromHoldingDays(days: string, today = new Date()): string | undefined {
  if (!/^[1-9]\d*$/.test(days)) return undefined
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  date.setDate(date.getDate() - Number(days))
  return formatLocalDate(date)
}

function parsePositiveDecimal(value: string, maxDecimals: number): number | undefined {
  const normalized = String(value ?? '').trim()
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`).test(normalized)) return undefined
  const number = Number(normalized)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function parsePositiveMoney(value: string): number | undefined {
  const normalized = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined
  const number = Number(normalized)
  if (!Number.isFinite(number) || number <= 0) return undefined
  const cents = Math.round(number * 100)
  return Number.isSafeInteger(cents) && cents > 0 ? cents : undefined
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
