import type {
  PortfolioEvent,
  PortfolioInstallment,
  PortfolioPlan,
} from '@/domains/portfolio/models/index.ts'
import {
  getNextPlanOccurrenceDate,
  planInstallmentId,
} from '@/domains/portfolio/services/portfolioPlanService.ts'

export interface PlanInstallmentViewModel {
  readonly confirmedDateText: string
  readonly detailText: string
  readonly id: string
  readonly isVirtual: boolean
  readonly plannedDate: string
  readonly plannedDateText: string
  readonly status: PortfolioInstallment['status']
  readonly statusText: string
}

export interface PortfolioPlanViewModel {
  readonly amountText: string
  readonly cycleText: string
  readonly executionModeText: string
  readonly feeRateText: string
  readonly id: string
  readonly installmentCount: number
  readonly installments: readonly PlanInstallmentViewModel[]
  readonly nextDateText: string
  readonly nextInstallment: PlanInstallmentViewModel | null
  readonly status: PortfolioPlan['status']
  readonly statusText: string
}

export interface PlanExecutionRequest {
  readonly fundCode: string
  readonly installmentId: string
  readonly planId: string
  readonly plannedDate: string
}

export interface PlanInstallmentActionRequest {
  readonly fundCode: string
  readonly installmentId: string
}

export function toPortfolioPlanViewModel(
  plan: PortfolioPlan,
  installments: readonly PortfolioInstallment[],
  events: readonly PortfolioEvent[],
  today: string,
): PortfolioPlanViewModel {
  const planInstallments = installments
    .filter(({ planId }) => planId === plan.id)
    .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate))
  const viewModels = planInstallments.map((installment) =>
    toInstallmentViewModel(installment, events),
  )
  const nextDate = getNextPlanOccurrenceDate(plan, today)
  const hasNext =
    nextDate !== undefined && !viewModels.some(({ plannedDate }) => plannedDate === nextDate)
  if (hasNext && nextDate !== undefined) {
    const virtual: PlanInstallmentViewModel = {
      confirmedDateText: '--',
      detailText: `含费总额 ${formatMoney(plan.amountCents)}`,
      id: planInstallmentId(plan.id, nextDate),
      isVirtual: true,
      plannedDate: nextDate,
      plannedDateText: nextDate,
      status: 'pending',
      statusText: '待处理',
    }
    viewModels.push(virtual)
  }
  const pending = viewModels.find(({ status }) => status === 'pending') ?? null
  return {
    amountText: formatMoney(plan.amountCents),
    cycleText:
      plan.cycle === 'weekly'
        ? `每周 ${weekdayText(plan.executionDay)}`
        : plan.cycle === 'monthly'
          ? `每月 ${plan.executionDay} 日`
          : '每天（交易日）',
    executionModeText: plan.executionMode === 'manual' ? '手动执行' : '本地生成草稿',
    feeRateText: plan.purchaseFeeRate === undefined ? '跟随基金资料' : `${plan.purchaseFeeRate}%`,
    id: plan.id,
    installmentCount: planInstallments.length,
    installments: viewModels.slice(-8).reverse(),
    nextDateText: pending?.plannedDateText ?? '--',
    nextInstallment: pending,
    status: plan.status,
    statusText: plan.status === 'active' ? '运行中' : '已暂停',
  }
}

function toInstallmentViewModel(
  installment: PortfolioInstallment,
  events: readonly PortfolioEvent[],
): PlanInstallmentViewModel {
  const event = events.find(
    (candidate) => candidate.kind === 'buy' && candidate.installmentId === installment.id,
  )
  const status = event?.settlementStatus === 'settled' ? 'executed' : installment.status
  return {
    confirmedDateText: installment.confirmedDate ?? '--',
    detailText:
      status === 'executed'
        ? '关联买入已结算'
        : event === undefined
          ? '尚未生成买入记录'
          : '待确认买入事实',
    id: installment.id,
    isVirtual: false,
    plannedDate: installment.plannedDate,
    plannedDateText: installment.plannedDate,
    status,
    statusText: statusText(status),
  }
}

function statusText(status: PortfolioInstallment['status']): string {
  return {
    cancelled: '已取消',
    executed: '已执行',
    pending: '待处理',
    skipped: '已跳过',
  }[status]
}

function weekdayText(value: number): string {
  return ['一', '二', '三', '四', '五', '六', '日'][value - 1] ?? String(value)
}

function formatMoney(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`
}
