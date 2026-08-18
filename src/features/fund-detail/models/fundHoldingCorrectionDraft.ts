export interface FundHoldingCorrectionDraft {
  confirmedDate: string
  reason: string
  targetUnits: string
  totalCostYuan: string
}

export interface FundHoldingCorrectionDraftErrors {
  readonly confirmedDate?: string
  readonly reason?: string
  readonly target?: string
  readonly targetUnits?: string
  readonly totalCostYuan?: string
}

export interface FundHoldingCorrectionInput {
  readonly confirmedDate: string
  readonly reason: string
  readonly targetUnits: number
  readonly totalCostCents: number
}

export function createFundHoldingCorrectionDraft(
  targetUnits = 0,
  totalCostCents = 0,
  today = new Date(),
): FundHoldingCorrectionDraft {
  return {
    confirmedDate: formatLocalDate(today),
    reason: '',
    targetUnits: String(targetUnits),
    totalCostYuan: (totalCostCents / 100).toFixed(2),
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
    reason?: string
    target?: string
    targetUnits?: string
    totalCostYuan?: string
  } = {}
  const targetUnits = parseNonNegativeDecimal(draft.targetUnits, 4)
  const totalCostCents = parseNonNegativeMoney(draft.totalCostYuan)

  if (targetUnits === undefined) errors.targetUnits = '请输入不小于 0、最多 4 位小数的份额'
  if (totalCostCents === undefined) errors.totalCostYuan = '请输入不小于 0、最多 2 位小数的总成本'
  if (
    targetUnits !== undefined &&
    totalCostCents !== undefined &&
    (targetUnits === 0) !== (totalCostCents === 0)
  ) {
    errors.target = '份额和总成本必须同时为零或同时为正'
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
