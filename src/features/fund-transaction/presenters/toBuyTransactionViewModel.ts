import type {
  PortfolioFieldConfidence,
  PortfolioBuyEvent,
  PortfolioValueSource,
} from '@/domains/portfolio/models/index.ts'
import type {
  PortfolioBuyCalculation,
  PortfolioCalculation,
} from '@/domains/portfolio/services/calculatePortfolio.ts'

export type BuyTransactionDisplayStatus = 'actual' | 'estimated' | 'pending'

export interface BuyTransactionFieldViewModel {
  readonly confidence: PortfolioFieldConfidence
  readonly sourceText: string
  readonly text: string
}

export interface BuyTransactionViewModel {
  readonly confirmedDateText: string
  readonly id: string
  readonly purchaseFee: BuyTransactionFieldViewModel
  readonly purchaseFeeRate: BuyTransactionFieldViewModel
  readonly status: BuyTransactionDisplayStatus
  readonly statusText: string
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
  const status = resolveStatus(event, result)
  return {
    confirmedDateText: event.confirmedDate,
    id: event.id,
    purchaseFee: toMoneyField(result.purchaseFee),
    purchaseFeeRate: toRateField(result.purchaseFeeRate),
    status,
    statusText: status === 'pending' ? '待结算' : status === 'estimated' ? '估算' : '实际',
    totalAmount: toMoneyField(result.totalAmount),
    unitNav: toNavField(result.unitNav),
    units: toUnitsField(result.units),
  }
}

function resolveStatus(
  event: PortfolioBuyEvent,
  calculation: PortfolioBuyCalculation,
): BuyTransactionDisplayStatus {
  if (event.settlementStatus === 'pending-settlement') return 'pending'
  if (
    [
      calculation.purchaseFee,
      calculation.purchaseFeeRate,
      calculation.unitNav,
      calculation.units,
    ].some(({ confidence }) => confidence === 'estimated' || confidence === 'unknown')
  ) {
    return 'estimated'
  }
  return 'actual'
}

function toMoneyField(
  field: PortfolioBuyCalculation['purchaseFee'] | PortfolioBuyEvent['totalAmount'],
) {
  return {
    confidence: field.confidence,
    sourceText: sourceText(field.source),
    text: field.value === null ? '--' : `¥${(field.value / 100).toFixed(2)}`,
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
