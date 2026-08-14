import type { PortfolioSellEvent } from '@/domains/portfolio/models/index.ts'

export interface SellDraftInput {
  readonly actualNetAmountYuan?: string
  readonly actualRedemptionFeeYuan?: string
  readonly actualUnitNav?: string
  readonly confirmedDate: string
  readonly fundCode: string
  readonly id: string
  readonly units: string
}

export interface SellDraftOptions {
  readonly now: string
  readonly today: string
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.confirmedDate)) {
    errors.confirmedDate = '确认日期无效'
  } else if (input.confirmedDate > options.today) {
    errors.confirmedDate = '确认日期不能晚于今天'
  }

  const units = parseUnits(input.units)
  if (units === null || units <= 0) {
    errors.units = '卖出份额必须是正数，且最多四位小数'
  }

  const actualUnitNav = parseUnitNav(input.actualUnitNav)
  if (input.actualUnitNav !== undefined && actualUnitNav === null) {
    errors.actualUnitNav = '单位净值必须是正数，且最多四位小数'
  }
  const actualNetAmountCents = parseMoneyCents(input.actualNetAmountYuan)
  if (input.actualNetAmountYuan !== undefined && actualNetAmountCents === null) {
    errors.actualNetAmountYuan = '实际到账金额最多两位小数'
  }
  const actualRedemptionFeeCents = parseMoneyCents(input.actualRedemptionFeeYuan)
  if (input.actualRedemptionFeeYuan !== undefined && actualRedemptionFeeCents === null) {
    errors.actualRedemptionFeeYuan = '实际赎回费最多两位小数'
  }

  if (Object.keys(errors).length > 0 || units === null) return { errors, ok: false }

  return {
    draft: {
      auditedAt: options.now,
      confirmedDate: input.confirmedDate,
      createdAt: options.now,
      fundCode: input.fundCode,
      id: input.id,
      kind: 'sell',
      netAmount: actualField(actualNetAmountCents),
      redemptionFee: actualField(actualRedemptionFeeCents),
      settlementStatus: 'settled',
      source: 'manual',
      unitNav: actualField(actualUnitNav),
      units: field(units),
      updatedAt: options.now,
    },
    ok: true,
  }
}

function field<T>(value: T) {
  return { confidence: 'actual', source: 'manual', value } as const
}

function actualField<T>(value: T | null) {
  return value === null ? undefined : field(value)
}

function parseMoneyCents(value: string | undefined): number | null {
  if (value === undefined || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null
  const [yuan, fraction = ''] = value.trim().split('.')
  const cents = Number(`${yuan}${fraction.padEnd(2, '0')}`)
  return Number.isSafeInteger(cents) ? cents : null
}

function parseUnits(value: string): number | null {
  if (!/^\d+(?:\.\d{1,4})?$/.test(value.trim())) return null
  const units = Number(value)
  return Number.isFinite(units) ? units : null
}

function parseUnitNav(value: string | undefined): number | null {
  if (value === undefined) return null
  if (!/^\d+(?:\.\d{1,4})?$/.test(value.trim())) return null
  const nav = Number(value)
  return Number.isFinite(nav) && nav > 0 ? nav : null
}
