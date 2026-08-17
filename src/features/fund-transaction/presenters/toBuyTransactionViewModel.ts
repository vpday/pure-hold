import type {
  PortfolioFieldConfidence,
  PortfolioBuyEvent,
  PortfolioValueSource,
} from '@/domains/portfolio/models/index.ts'
import type {
  PortfolioBuyCalculation,
  PortfolioCalculation,
} from '@/domains/portfolio/services/calculatePortfolio.ts'

export type BuyTransactionDisplayStatus = 'pending' | 'settled-nav-pending' | 'settled-nav-ready'

export interface BuyTransactionFieldViewModel {
  readonly confidence: PortfolioFieldConfidence
  readonly sourceText: string
  readonly text: string
}

export interface BuyTransactionViewModel {
  readonly confirmedDateText: string
  readonly entryMode: PortfolioBuyEvent['entryMode']
  readonly expectedConfirmationDateText: string
  readonly id: string
  readonly navDateText: string
  readonly purchaseFee: BuyTransactionFieldViewModel
  readonly purchaseFeeRate: BuyTransactionFieldViewModel
  readonly status: BuyTransactionDisplayStatus
  readonly statusText: string
  readonly submittedAtText: string
  readonly totalAmount: BuyTransactionFieldViewModel
  readonly unitNav: BuyTransactionFieldViewModel
  readonly units: BuyTransactionFieldViewModel
}

export function toBuyTransactionViewModel(
  event: PortfolioBuyEvent,
  calculation: PortfolioCalculation,
): BuyTransactionViewModel {
  const calculated = calculation.events.find(({ eventId }) => eventId === event.id)
  const result = calculated ?? fallbackCalculation(event)
  const status = resolveStatus(result)
  return {
    confirmedDateText: event.confirmedDate ?? '--',
    entryMode: event.entryMode,
    expectedConfirmationDateText: event.expectedConfirmationDate ?? '--',
    id: event.id,
    navDateText: event.navDate,
    purchaseFee: toMoneyField(result.purchaseFee, true),
    purchaseFeeRate: toRateField(result.purchaseFeeRate),
    status,
    statusText: statusText(status),
    submittedAtText: event.submittedAt,
    totalAmount: toMoneyField(result.totalAmount),
    unitNav: toNavField(result.unitNav),
    units: toUnitsField(result.units),
  }
}

function resolveStatus(calculation: PortfolioBuyCalculation): BuyTransactionDisplayStatus {
  if (calculation.settlementStatus === 'pending-settlement') return 'pending'
  return calculation.unitNav.value === null ? 'settled-nav-pending' : 'settled-nav-ready'
}

function statusText(status: BuyTransactionDisplayStatus): string {
  if (status === 'pending') return '待确认'
  if (status === 'settled-nav-pending') return '已确认，净值待补全'
  return '已确认，净值已获取'
}

function toMoneyField(
  field: PortfolioBuyCalculation['purchaseFee'] | PortfolioBuyEvent['totalAmount'],
  hideEstimated = false,
) {
  return {
    confidence: field.confidence,
    sourceText: sourceText(field.source),
    text:
      field.value === null || (hideEstimated && field.confidence === 'estimated')
        ? '--'
        : `¥${(field.value / 100).toFixed(2)}`,
  }
}

function toRateField(field: PortfolioBuyCalculation['purchaseFeeRate']) {
  return {
    confidence: field.confidence,
    sourceText: sourceText(field.source),
    text: field.value === null ? '--' : `${field.value}%`,
  }
}

function toNavField(field: PortfolioBuyCalculation['unitNav']) {
  return {
    confidence: field.confidence,
    sourceText: sourceText(field.source),
    text: field.value === null ? '--' : field.value.toFixed(4),
  }
}

function toUnitsField(field: PortfolioBuyCalculation['units']) {
  return {
    confidence: field.confidence,
    sourceText: sourceText(field.source),
    text: field.value === null ? '--' : field.value.toFixed(4),
  }
}

function fallbackCalculation(event: PortfolioBuyEvent): PortfolioBuyCalculation {
  return {
    eventId: event.id,
    fundCode: event.fundCode,
    netPurchaseAmount: {
      confidence: 'unknown',
      source: 'formula',
      value: null,
    },
    purchaseFee: event.purchaseFee,
    purchaseFeeRate: event.purchaseFeeRate,
    settlementStatus: event.settlementStatus,
    totalAmount: event.totalAmount,
    unitNav: event.unitNav,
    units: event.units,
  }
}

function sourceText(source: PortfolioValueSource): string {
  switch (source) {
    case 'fund-basic-info':
      return '基金基础资料'
    case 'formula':
      return '本地计算'
    case 'manual':
      return '手工录入'
    case 'migration':
      return '初始持仓'
    case 'nav-history':
      return '历史净值'
    case 'platform':
      return '平台实际值'
  }
}
