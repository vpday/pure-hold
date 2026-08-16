import type { PortfolioBuyEvent } from '@/domains/portfolio/models/index.ts'

export interface BuyDraftInput {
  readonly actualPurchaseFeeYuan?: string
  readonly actualUnitNav?: string
  readonly actualUnits?: string
  readonly confirmedDate: string
  readonly fundCode: string
  readonly id: string
  readonly installmentId?: string
  readonly planId?: string
  readonly purchaseFeePercent: number | null
  readonly purchaseFeePercentSource?: 'fund-basic-info' | 'manual'
  readonly totalAmountYuan: string
}

export interface BuyDraftOptions {
  readonly now: string
  readonly today: string
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
  const hasPlanAssociation = input.planId !== undefined || input.installmentId !== undefined
  if (hasPlanAssociation && (!input.planId || !input.installmentId)) {
    errors.planAssociation = '定投买入必须同时关联计划和期次'
  }
  if (!isValidDate(input.confirmedDate)) {
    errors.confirmedDate = '确认日期无效'
  } else if (input.confirmedDate > options.today) {
    errors.confirmedDate = '确认日期不能晚于今天'
  } else if (isWeekend(input.confirmedDate)) {
    errors.confirmedDate = '确认日期不能是周末'
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

  const actualUnits = parseUnits(input.actualUnits)
  if (input.actualUnits !== undefined && actualUnits === null) {
    errors.actualUnits = '实际份额最多四位小数'
  }
  const actualPurchaseFeeCents = parseMoneyCents(input.actualPurchaseFeeYuan)
  if (input.actualPurchaseFeeYuan !== undefined && actualPurchaseFeeCents === null) {
    errors.actualPurchaseFeeYuan = '实际申购费最多两位小数'
  }
  const actualUnitNav = parseUnitNav(input.actualUnitNav)
  if (input.actualUnitNav !== undefined && actualUnitNav === null) {
    errors.actualUnitNav = '实际单位净值必须是正数，且最多四位小数'
  }

  if (Object.keys(errors).length > 0 || totalAmountCents === null) return { errors, ok: false }

  const draft: PortfolioBuyEvent = {
    auditedAt: options.now,
    confirmedDate: input.confirmedDate,
    createdAt: options.now,
    fundCode: input.fundCode,
    id: input.id,
    kind: 'buy',
    purchaseFee: actualField(actualPurchaseFeeCents, 'manual'),
    purchaseFeeRate:
      input.purchaseFeePercent === null
        ? unknownField('fund-basic-info')
        : field(
            input.purchaseFeePercent,
            'actual',
            input.purchaseFeePercentSource ?? 'fund-basic-info',
          ),
    settlementStatus:
      actualUnits !== null || (actualUnitNav !== null && input.purchaseFeePercent !== null)
        ? 'settled'
        : 'pending-settlement',
    source: hasPlanAssociation ? 'plan' : 'manual',
    totalAmount: field(totalAmountCents, 'actual', 'manual'),
    unitNav: actualField(actualUnitNav, 'manual'),
    units: actualField(actualUnits, 'manual'),
    updatedAt: options.now,
  }
  if (hasPlanAssociation) {
    return {
      draft: {
        ...draft,
        installmentId: input.installmentId,
        planId: input.planId,
      },
      ok: true,
    }
  }
  return { draft, ok: true }
}

function field<T>(value: T | null, confidence: 'actual', source: 'manual' | 'fund-basic-info') {
  return { confidence, source, value } as const
}

function actualField<T>(value: T | null, source: 'manual') {
  return value === null ? unknownField(source) : field(value, 'actual', source)
}

function unknownField(source: 'manual' | 'fund-basic-info') {
  return { confidence: 'unknown', source, value: null } as const
}

function parseMoneyCents(value: string | undefined): number | null {
  if (value === undefined || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null
  const [yuan, fraction = ''] = value.trim().split('.')
  const cents = Number(`${yuan}${fraction.padEnd(2, '0')}`)
  return Number.isSafeInteger(cents) ? cents : null
}

function parseUnits(value: string | undefined): number | null {
  if (value === undefined) return null
  if (!/^\d+(?:\.\d{1,4})?$/.test(value.trim())) return null
  const units = Number(value)
  return Number.isFinite(units) ? units : null
}

function parseUnitNav(value: string | undefined): number | null {
  const nav = parseUnits(value)
  return nav !== null && nav > 0 ? nav : null
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isWeekend(value: string): boolean {
  return [0, 6].includes(new Date(`${value}T00:00:00.000Z`).getUTCDay())
}

function hasMaxDecimals(value: number, maxDecimals: number): boolean {
  const scale = 10 ** maxDecimals
  return Math.abs(value * scale - Math.round(value * scale)) <= 1e-8
}
