export interface FundHoldingCorrectionDraft {
  confirmedDate: string
  reason: string
  targetUnits: string
  holdingAmountYuan: string
  holdingIncomeYuan: string
}

export interface FundHoldingCorrectionDraftErrors {
  readonly confirmedDate?: string
  readonly holdingAmountYuan?: string
  readonly holdingIncomeYuan?: string
  readonly reason?: string
  readonly target?: string
  readonly targetUnits?: string
}

export interface FundHoldingCorrectionInput {
  readonly confirmedDate: string
  readonly reason: string
  readonly targetUnits: number
  readonly totalCostCents: number
}

export function createFundHoldingCorrectionDraft(
  targetUnits = 0,
  holdingAmountYuan = 0,
  holdingIncomeYuan = 0,
  today = new Date(),
): FundHoldingCorrectionDraft {
  return {
    confirmedDate: formatLocalDate(today),
    holdingAmountYuan: holdingAmountYuan.toFixed(2),
    holdingIncomeYuan: holdingIncomeYuan.toFixed(2),
    reason: '',
    targetUnits: String(targetUnits),
  }
}

export function validateFundHoldingCorrectionDraft(
  draft: FundHoldingCorrectionDraft,
  today = new Date(),
):
  | { readonly errors: FundHoldingCorrectionDraftErrors; readonly input?: undefined }
  | {
      readonly errors: Readonly<Record<string, never>>
      readonly input: FundHoldingCorrectionInput
    } {
  const errors: {
    confirmedDate?: string
    holdingAmountYuan?: string
    holdingIncomeYuan?: string
    reason?: string
    target?: string
    targetUnits?: string
  } = {}
  const targetUnits = parseNonNegativeDecimal(draft.targetUnits, 4)
  const holdingAmountCents = parseNonNegativeMoney(draft.holdingAmountYuan)
  const holdingIncomeCents = parseSignedMoney(draft.holdingIncomeYuan)
  const totalCostCents = calculateTotalCostCents(holdingAmountCents, holdingIncomeCents)

  if (targetUnits === undefined) errors.targetUnits = '请输入不小于 0、最多 4 位小数的份额'
  if (holdingAmountCents === undefined) {
    errors.holdingAmountYuan = '请输入不小于 0、最多 2 位小数的持仓金额'
  }
  if (holdingIncomeCents === undefined) {
    errors.holdingIncomeYuan = '请输入可带负号、最多 2 位小数的持仓收益'
  }
  if (
    holdingAmountCents !== undefined &&
    holdingIncomeCents !== undefined &&
    totalCostCents === undefined
  ) {
    errors.holdingIncomeYuan = '持仓金额减去持仓收益后，计算出的总成本不能为负数'
  }
  if (
    targetUnits !== undefined &&
    totalCostCents !== undefined &&
    (targetUnits === 0) !== (totalCostCents === 0)
  ) {
    errors.target = '份额和计算出的总成本必须同时为零或同时为正'
  }
  if (draft.reason.trim() === '') errors.reason = '请填写修正原因'

  const confirmedDate = validateDate(draft.confirmedDate, today)
  if (confirmedDate === undefined) errors.confirmedDate = '请选择不晚于今天的有效日期'

  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors: {},
    input: {
      confirmedDate: confirmedDate!,
      reason: draft.reason.trim(),
      targetUnits: targetUnits!,
      totalCostCents: totalCostCents!,
    },
  }
}

function parseNonNegativeDecimal(value: string, maxDecimals: number): number | undefined {
  const normalized = String(value ?? '').trim()
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`).test(normalized)) return undefined
  const number = Number(normalized)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

function parseNonNegativeMoney(value: string): number | undefined {
  const normalized = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined
  const number = Number(normalized)
  if (!Number.isFinite(number) || number < 0) return undefined
  const cents = Math.round(number * 100)
  return Number.isSafeInteger(cents) ? cents : undefined
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
  return Number.isSafeInteger(totalCostCents) && totalCostCents >= 0 ? totalCostCents : undefined
}

function validateDate(value: string, today: Date): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    return undefined
  const todayText = formatLocalDate(today)
  return value <= todayText ? value : undefined
}

function formatLocalDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
