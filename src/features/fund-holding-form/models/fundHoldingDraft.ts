import {
  createFundHolding,
  holdingTotalCostCents,
  type FundDividendMode,
  type FundHolding,
} from '@/domains/funds/models/fundHolding.ts'

export type FundHoldingTimeMode = 'date' | 'days'

export interface FundHoldingDraft {
  dividendMode: FundDividendMode | ''
  holdingAmountYuan: string
  holdingDays: string
  holdingIncomeYuan: string
  purchaseDate: string
  timeMode: FundHoldingTimeMode
  units: string
}

export interface FundHoldingDraftErrors {
  readonly dividendMode?: string
  readonly holdingAmountYuan?: string
  readonly time?: string
  readonly holdingIncomeYuan?: string
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
    holdingAmountYuan: '',
    holdingDays: '',
    holdingIncomeYuan: '',
    purchaseDate: '',
    timeMode: 'date',
    units: '',
  }
}

export function createFundHoldingDraft(
  holding: FundHolding,
  currentNav: number | null = null,
): FundHoldingDraft {
  const totalCostCents = holdingTotalCostCents(holding)
  const holdingAmountCents = holdingAmountCentsFromNav(currentNav, holding.units)
  const holdingIncomeCents =
    holdingAmountCents !== null && totalCostCents !== null
      ? holdingAmountCents - totalCostCents
      : null
  return {
    dividendMode: holding.dividendMode,
    holdingAmountYuan: formatMoneyCents(holdingAmountCents),
    holdingDays: '',
    holdingIncomeYuan: formatMoneyCents(holdingIncomeCents),
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
    dividendMode?: string
    holdingAmountYuan?: string
    time?: string
    holdingIncomeYuan?: string
    units?: string
  } = {}
  const units = parsePositiveDecimal(draft.units, 4)
  const holdingAmountCents = parsePositiveMoney(draft.holdingAmountYuan)
  const holdingIncomeCents = parseSignedMoney(draft.holdingIncomeYuan)
  if (units === undefined) errors.units = '请输入大于 0、最多 4 位小数的份额'
  if (holdingAmountCents === undefined) {
    errors.holdingAmountYuan = '请输入大于 0、最多 2 位小数的持仓金额'
  }
  if (holdingIncomeCents === undefined) {
    errors.holdingIncomeYuan = '请输入可带负号、最多 2 位小数的持仓收益'
  }
  const totalCostCents = calculateTotalCostCents(holdingAmountCents, holdingIncomeCents)
  if (
    holdingAmountCents !== undefined &&
    holdingIncomeCents !== undefined &&
    totalCostCents === undefined
  ) {
    errors.holdingIncomeYuan = '持仓金额减去持仓收益后，计算出的总成本必须大于 0'
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
      : validateHoldingDaysPurchaseDate(draft.holdingDays, today)
  if (!purchaseDate) {
    errors.time =
      draft.timeMode === 'date'
        ? '请选择早于今天且非周末的购买日期'
        : '请输入正整数持仓天数，且换算后的购买日期须早于今天且非周末'
  }
  return purchaseDate
}

function validateHoldingDaysPurchaseDate(days: string, today: Date): string | undefined {
  const purchaseDate = purchaseDateFromHoldingDays(days, today)
  return purchaseDate === undefined ? undefined : validatePurchaseDate(purchaseDate, today)
}

export function purchaseDateFromHoldingDays(days: string, today = new Date()): string | undefined {
  if (!/^[1-9]\d*$/.test(days)) return undefined
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  date.setDate(date.getDate() - Number(days))
  return formatLocalDate(date)
}

export function holdingDaysFromPurchaseDate(
  purchaseDate: string,
  today = new Date(),
): string | undefined {
  const purchase = parseLocalDate(purchaseDate)
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (purchase === undefined || purchase >= current) return undefined
  const days =
    (Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()) -
      Date.UTC(purchase.getFullYear(), purchase.getMonth(), purchase.getDate())) /
    86_400_000
  return Number.isInteger(days) && days > 0 ? String(days) : undefined
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

function parseSignedMoney(value: string): number | undefined {
  const normalized = String(value ?? '').trim()
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined
  const number = Number(normalized)
  if (!Number.isFinite(number)) return undefined
  const cents = Math.round(number * 100)
  return Number.isSafeInteger(cents) ? cents : undefined
}

function calculateTotalCostCents(
  holdingAmountCents: number | undefined,
  holdingIncomeCents: number | undefined,
): number | undefined {
  if (holdingAmountCents === undefined || holdingIncomeCents === undefined) return undefined
  const totalCostCents = holdingAmountCents - holdingIncomeCents
  return Number.isSafeInteger(totalCostCents) && totalCostCents > 0 ? totalCostCents : undefined
}

function holdingAmountCentsFromNav(currentNav: number | null, units: number): number | null {
  if (currentNav === null || !Number.isFinite(currentNav) || currentNav <= 0) return null
  const amountCents = Math.round(currentNav * units * 100)
  return Number.isSafeInteger(amountCents) && amountCents > 0 ? amountCents : null
}

function formatMoneyCents(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2)
}

function validatePurchaseDate(value: string, today: Date): string | undefined {
  const date = parseLocalDate(value)
  if (date === undefined) return undefined
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (date >= localToday || [0, 6].includes(date.getDay())) return undefined
  return value
}

function parseLocalDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
    ? date
    : undefined
}

function formatLocalDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
