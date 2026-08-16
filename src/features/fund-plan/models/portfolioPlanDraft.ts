import type {
  PortfolioExecutionMode,
  PortfolioPlan,
  PortfolioPlanCycle,
  PortfolioPlanStatus,
} from '@/domains/portfolio/models/index.ts'
import { isTradingDay } from '@/domains/portfolio/services/tradingCalendar.ts'

export interface PortfolioPlanDraft {
  readonly cycle: PortfolioPlanCycle
  readonly endDate: string
  readonly executionDay: string
  readonly executionMode: PortfolioExecutionMode
  readonly fundCode: string
  readonly id?: string
  readonly amountYuan: string
  readonly purchaseFeePercent: string
  readonly startDate: string
  readonly status: PortfolioPlanStatus
}

export interface PortfolioPlanDraftOptions {
  readonly now: string
  readonly today: string
}

export interface PortfolioPlanDraftFailure {
  readonly errors: Readonly<Record<string, string>>
  readonly ok: false
}

export type PortfolioPlanDraftResult =
  | { readonly ok: true; readonly plan: PortfolioPlan }
  | PortfolioPlanDraftFailure

export function createPortfolioPlanDraft(
  plan: PortfolioPlan | undefined,
  fundCode: string,
  today: string,
): PortfolioPlanDraft {
  return plan === undefined
    ? {
        amountYuan: '',
        cycle: 'monthly',
        endDate: '',
        executionDay: '1',
        executionMode: 'manual',
        fundCode,
        purchaseFeePercent: '',
        startDate: defaultStartDate(today),
        status: 'active',
      }
    : {
        amountYuan: formatCents(plan.amountCents),
        cycle: plan.cycle,
        endDate: plan.endDate ?? '',
        executionDay: String(plan.executionDay),
        executionMode: plan.executionMode,
        fundCode: plan.fundCode,
        id: plan.id,
        purchaseFeePercent: plan.purchaseFeeRate === undefined ? '' : String(plan.purchaseFeeRate),
        startDate: plan.startDate,
        status: plan.status,
      }
}

export function submitPortfolioPlanDraft(
  draft: PortfolioPlanDraft,
  options: PortfolioPlanDraftOptions,
): PortfolioPlanDraftResult {
  const errors: Record<string, string> = {}
  if (!/^\d{6}$/.test(draft.fundCode)) errors.fundCode = '基金代码无效'

  const amountCents = parseMoneyCents(draft.amountYuan)
  if (amountCents === null || amountCents <= 0) {
    errors.amountYuan = '每期含费总额必须是正数，且最多两位小数'
  }

  const executionDay = parseInteger(draft.executionDay)
  if (!['weekly', 'monthly', 'daily'].includes(draft.cycle)) {
    errors.cycle = '执行周期无效'
  } else if (executionDay === null) {
    errors.executionDay = '执行日必须是整数'
  } else if (
    (draft.cycle === 'weekly' && (executionDay < 1 || executionDay > 7)) ||
    (draft.cycle === 'monthly' && (executionDay < 1 || executionDay > 31)) ||
    (draft.cycle === 'daily' && executionDay !== 1)
  ) {
    errors.executionDay =
      draft.cycle === 'weekly'
        ? '执行星期应为 1 至 7'
        : draft.cycle === 'monthly'
          ? '执行日期应为 1 至 31'
          : '每天周期的执行日必须为 1'
  }

  const validStartDate = isValidDate(draft.startDate)
  if (!validStartDate) {
    errors.startDate = '开始日期无效'
  } else if (draft.startDate > options.today) {
    errors.startDate = '开始日期不能晚于今天'
  } else if (isWeekend(draft.startDate)) {
    errors.startDate = '开始日期不能是周末'
  }

  const validEndDate = !draft.endDate || isValidDate(draft.endDate)
  if (!validEndDate) {
    errors.endDate = '结束日期无效'
  } else if (draft.endDate && isWeekend(draft.endDate)) {
    errors.endDate = '结束日期不能是周末'
  } else if (validStartDate && draft.endDate && draft.endDate < draft.startDate) {
    errors.endDate = '结束日期不能早于开始日期'
  }

  const purchaseFeeRate = parseRate(draft.purchaseFeePercent)
  if (draft.purchaseFeePercent.trim() && purchaseFeeRate === null) {
    errors.purchaseFeePercent = '申购费率应为 0 至 100 的数字，最多四位小数'
  }
  if (Object.keys(errors).length > 0 || amountCents === null || executionDay === null) {
    return { errors, ok: false }
  }

  const id = draft.id ?? `plan:${draft.fundCode}:${globalThis.crypto.randomUUID()}`
  const plan: PortfolioPlan = {
    amountCents,
    createdAt: options.now,
    cycle: draft.cycle,
    executionDay,
    executionMode: draft.executionMode,
    fundCode: draft.fundCode,
    id,
    startDate: draft.startDate,
    status: draft.status,
    updatedAt: options.now,
    ...(draft.endDate ? { endDate: draft.endDate } : {}),
    ...(purchaseFeeRate !== null ? { purchaseFeeRate } : {}),
  }
  return { ok: true, plan }
}

function parseMoneyCents(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const [yuan, fraction = ''] = normalized.split('.')
  const cents = Number(`${yuan}${fraction.padEnd(2, '0')}`)
  return Number.isSafeInteger(cents) ? cents : null
}

function parseInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function parseRate(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return null
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized)) return null
  const rate = Number(normalized)
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : null
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isWeekend(value: string): boolean {
  return [0, 6].includes(new Date(`${value}T00:00:00.000Z`).getUTCDay())
}

function defaultStartDate(today: string): string {
  if (!isValidDate(today)) return today
  let candidate = today
  while (!isTradingDay(candidate)) {
    const date = new Date(`${candidate}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() - 1)
    candidate = date.toISOString().slice(0, 10)
  }
  return candidate
}

function formatCents(value: number): string {
  return (value / 100).toFixed(2)
}
