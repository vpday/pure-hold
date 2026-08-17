import type {
  FieldValue,
  PortfolioBuyEvent,
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

export interface BuyDraftInput {
  readonly actualPurchaseFeeYuan?: string
  readonly actualUnits?: string
  readonly confirmedDate?: string
  readonly entryMode: PortfolioTransactionEntryMode
  readonly fundCode: string
  readonly id: string
  readonly purchaseFeePercent: number | null
  readonly purchaseFeePercentSource?: 'fund-basic-info' | 'manual'
  readonly submittedAt: string
  readonly totalAmountYuan: string
}

export interface BuyDraftOptions {
  readonly confirmationDays: number | null
  readonly now: string
}

export interface BuyDraftValidationFailure {
  readonly errors: Readonly<Record<string, string>>
  readonly ok: false
}

export type BuyDraftResult =
  | { readonly draft: PortfolioBuyEvent; readonly ok: true }
  | BuyDraftValidationFailure

export function createBuyDraft(input: BuyDraftInput, options: BuyDraftOptions): BuyDraftResult {
  const errors: Record<string, string> = {}
  if (!/^\d{6}$/.test(input.fundCode)) errors.fundCode = '基金代码无效'

  const schedule = validateSubmission(input.submittedAt, options, errors)
  if (input.entryMode !== 'pending' && input.entryMode !== 'historical') {
    errors.entryMode = '录入模式无效'
  }

  const totalAmountCents = parseMoneyCents(input.totalAmountYuan)
  if (totalAmountCents === null || totalAmountCents <= 0) {
    errors.totalAmountYuan = '含费总额必须是正数，且最多两位小数'
  }

  if (
    input.purchaseFeePercent !== null &&
    (!Number.isFinite(input.purchaseFeePercent) ||
      input.purchaseFeePercent < 0 ||
      input.purchaseFeePercent > 100 ||
      !hasMaxDecimals(input.purchaseFeePercent, 4))
  ) {
    errors.purchaseFeePercent = '申购费率必须是 0 至 100 的数字，最多四位小数'
  }

  const actualUnits = parseOptionalUnits(input.actualUnits)
  if (input.actualUnits !== undefined && !isBlank(input.actualUnits) && actualUnits === null) {
    errors.actualUnits = '实际份额最多四位小数'
  }
  const actualPurchaseFeeCents = parseOptionalMoneyCents(input.actualPurchaseFeeYuan)
  if (
    input.actualPurchaseFeeYuan !== undefined &&
    !isBlank(input.actualPurchaseFeeYuan) &&
    actualPurchaseFeeCents === null
  ) {
    errors.actualPurchaseFeeYuan = '实际申购费最多两位小数'
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

  if (Object.keys(errors).length > 0 || totalAmountCents === null || schedule === null) {
    return { errors, ok: false }
  }

  const draft: PortfolioBuyEvent = {
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
    id: input.id,
    kind: 'buy',
    navDate: schedule.navDate,
    purchaseFee:
      actualPurchaseFeeCents === null
        ? unknownField('formula')
        : field(actualPurchaseFeeCents, 'actual', 'manual'),
    purchaseFeeRate:
      input.purchaseFeePercent === null
        ? unknownField('fund-basic-info')
        : field(
            input.purchaseFeePercent,
            'actual',
            input.purchaseFeePercentSource ?? 'fund-basic-info',
          ),
    settlementStatus:
      confirmedDate !== undefined && actualUnits !== null ? 'settled' : 'pending-settlement',
    source: 'manual',
    submittedAt: input.submittedAt,
    totalAmount: field(totalAmountCents, 'actual', 'manual'),
    unitNav: unknownField('nav-history'),
    units: toActualOrUnknown(actualUnits, 'manual'),
    updatedAt: options.now,
  }
  return { draft, ok: true }
}

function validateSubmission(
  submittedAt: string,
  options: BuyDraftOptions,
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
  options: BuyDraftOptions,
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

function field<T>(
  value: T,
  confidence: 'actual',
  source: 'manual' | 'fund-basic-info',
): FieldValue<T> {
  return { confidence, source, value }
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

function hasMaxDecimals(value: number, maxDecimals: number): boolean {
  const scale = 10 ** maxDecimals
  return Math.abs(value * scale - Math.round(value * scale)) <= 1e-8
}
