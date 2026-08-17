import type {
  FieldValue,
  PortfolioSellEvent,
  PortfolioTransactionEntryMode,
} from '@/domains/portfolio/models/index.ts'
import {
  deriveTransactionSchedule,
  getShanghaiDate,
  getShanghaiMinute,
  isShanghaiMinuteAtOrBefore,
  isTradingDay,
  isValidShanghaiMinute,
} from '@/domains/portfolio/services/tradingCalendar.ts'

export interface SellDraftInput {
  readonly actualGrossAmountYuan?: string
  readonly actualNetAmountYuan?: string
  readonly actualRedemptionFeeYuan?: string
  readonly actualUnits?: string
  readonly confirmedDate?: string
  readonly entryMode: PortfolioTransactionEntryMode
  readonly fundCode: string
  readonly id: string
  readonly requestedUnits: string
  readonly submittedAt: string
}

export interface SellDraftOptions {
  readonly confirmationDays: number | null
  readonly now: string
}

export interface SellDraftValidationFailure {
  readonly errors: Readonly<Record<string, string>>
  readonly ok: false
}

export type SellDraftResult =
  | { readonly draft: PortfolioSellEvent; readonly ok: true }
  | SellDraftValidationFailure

export function createSellDraft(input: SellDraftInput, options: SellDraftOptions): SellDraftResult {
  const errors: Record<string, string> = {}
  if (!/^\d{6}$/.test(input.fundCode)) errors.fundCode = '基金代码无效'

  const schedule = validateSubmission(input.submittedAt, options, errors)
  if (input.entryMode !== 'pending' && input.entryMode !== 'historical') {
    errors.entryMode = '录入模式无效'
  }

  const requestedUnits = parseUnits(input.requestedUnits)
  if (requestedUnits === null || requestedUnits <= 0) {
    errors.requestedUnits = '申请卖出份额必须是正数，且最多四位小数'
  }
  const actualUnits = parseOptionalUnits(input.actualUnits)
  if (input.actualUnits !== undefined && !isBlank(input.actualUnits) && actualUnits === null) {
    errors.actualUnits = '实际确认份额最多四位小数'
  }

  const actualGrossAmountCents = parseOptionalMoneyCents(input.actualGrossAmountYuan)
  if (
    input.actualGrossAmountYuan !== undefined &&
    !isBlank(input.actualGrossAmountYuan) &&
    actualGrossAmountCents === null
  ) {
    errors.actualGrossAmountYuan = '实际赎回毛额最多两位小数'
  }

  const actualNetAmountCents = parseOptionalMoneyCents(input.actualNetAmountYuan)
  if (
    input.actualNetAmountYuan !== undefined &&
    !isBlank(input.actualNetAmountYuan) &&
    actualNetAmountCents === null
  ) {
    errors.actualNetAmountYuan = '实际到账金额最多两位小数'
  }
  const actualRedemptionFeeCents = parseOptionalMoneyCents(input.actualRedemptionFeeYuan)
  if (
    input.actualRedemptionFeeYuan !== undefined &&
    !isBlank(input.actualRedemptionFeeYuan) &&
    actualRedemptionFeeCents === null
  ) {
    errors.actualRedemptionFeeYuan = '实际赎回费最多两位小数'
  }

  const confirmedDate = validateConfirmedDate(
    input.confirmedDate,
    schedule?.navDate,
    options,
    errors,
  )
  if (input.entryMode === 'historical') {
    if (confirmedDate === undefined) errors.confirmedDate = '历史补录必须填写确认日期'
    if (actualUnits === null) errors.actualUnits = '历史补录必须填写确认份额'
  }

  if (Object.keys(errors).length > 0 || requestedUnits === null || schedule === null) {
    return { errors, ok: false }
  }

  const draft: PortfolioSellEvent = {
    auditedAt: options.now,
    ...(confirmedDate === undefined ? {} : { confirmedDate }),
    createdAt: options.now,
    entryMode: input.entryMode,
    ...(input.entryMode === 'pending' &&
    confirmedDate === undefined &&
    schedule.expectedConfirmationDate !== undefined
      ? { expectedConfirmationDate: schedule.expectedConfirmationDate }
      : {}),
    fundCode: input.fundCode,
    grossAmount:
      actualGrossAmountCents === null ? unknownField('formula') : field(actualGrossAmountCents),
    id: input.id,
    kind: 'sell',
    navDate: schedule.navDate,
    netAmount: toActualOrUnknown(actualNetAmountCents, 'manual'),
    redemptionFee: toActualOrUnknown(actualRedemptionFeeCents, 'manual'),
    requestedUnits: field(requestedUnits),
    settlementStatus:
      confirmedDate !== undefined && actualUnits !== null ? 'settled' : 'pending-settlement',
    source: 'manual',
    submittedAt: input.submittedAt,
    unitNav: unknownField('nav-history'),
    units: toActualOrUnknown(actualUnits, 'manual'),
    updatedAt: options.now,
  }
  return { draft, ok: true }
}

function validateSubmission(
  submittedAt: string,
  options: SellDraftOptions,
  errors: Record<string, string>,
) {
  if (!isValidShanghaiMinute(submittedAt)) {
    errors.submittedAt = '提交时间必须是上海时区的 YYYY-MM-DD HH:mm'
    return null
  }
  const currentMinute = getShanghaiMinute(new Date(options.now))
  if (!isShanghaiMinuteAtOrBefore(submittedAt, currentMinute)) {
    errors.submittedAt = '提交时间不能晚于当前时间'
  }
  try {
    return deriveTransactionSchedule({
      confirmationDays: options.confirmationDays,
      submittedAt,
    })
  } catch {
    errors.submittedAt = '提交时间或确认规则无效'
    return null
  }
}

function validateConfirmedDate(
  value: string | undefined,
  navDate: string | undefined,
  options: SellDraftOptions,
  errors: Record<string, string>,
): string | undefined {
  if (value === undefined || isBlank(value)) return undefined
  if (!isValidDate(value)) {
    errors.confirmedDate = '确认日期无效'
    return undefined
  }
  const today = getShanghaiDate(new Date(options.now))
  if (navDate === undefined || !isTradingDay(value) || value < navDate || value > today) {
    errors.confirmedDate = '确认日期必须是不早于净值日期且不晚于今天的交易日'
    return undefined
  }
  return value
}

function field(value: number): FieldValue<number> {
  return { confidence: 'actual', source: 'manual', value }
}

function toActualOrUnknown<T>(value: T | null, source: 'formula' | 'manual'): FieldValue<T> {
  return value === null ? unknownField(source) : { confidence: 'actual', source, value }
}

function unknownField<T>(source: FieldValue<T>['source']): FieldValue<T> {
  return { confidence: 'unknown', source, value: null }
}

function parseOptionalMoneyCents(value: string | undefined): number | null {
  if (value === undefined || isBlank(value)) return null
  return parseMoneyCents(value)
}

function parseMoneyCents(value: string | undefined): number | null {
  if (value === undefined || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null
  const [yuan, fraction = ''] = value.trim().split('.')
  const cents = Number(`${yuan}${fraction.padEnd(2, '0')}`)
  return Number.isSafeInteger(cents) ? cents : null
}

function parseOptionalUnits(value: string | undefined): number | null {
  if (value === undefined || isBlank(value)) return null
  return parseUnits(value)
}

function parseUnits(value: string): number | null {
  if (!/^\d+(?:\.\d{1,4})?$/.test(value.trim())) return null
  const units = Number(value)
  return Number.isFinite(units) ? units : null
}

function isBlank(value: string): boolean {
  return value.trim() === ''
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
