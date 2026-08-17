export type PortfolioEventKind =
  | 'buy'
  | 'sell'
  | 'cash-dividend'
  | 'dividend-reinvestment'
  | 'initial-holding'
  | 'adjustment'

export type PortfolioSettlementStatus = 'pending-settlement' | 'settled'
export type PortfolioFieldConfidence = 'actual' | 'estimated' | 'unknown'
export type PortfolioValueSource =
  | 'manual'
  | 'platform'
  | 'fund-basic-info'
  | 'nav-history'
  | 'formula'
  | 'migration'

export type PortfolioEventSource =
  | 'manual'
  | 'dividend-reinvestment'
  | 'initial-holding'
  | 'adjustment'

export interface FieldValue<T> {
  readonly value: T | null
  readonly confidence: PortfolioFieldConfidence
  readonly source: PortfolioValueSource
}

export type MoneyFieldValue = FieldValue<number>
export type UnitsFieldValue = FieldValue<number>
export type NavFieldValue = FieldValue<number>

interface PortfolioEventBase {
  readonly id: string
  readonly fundCode: string
  readonly confirmedDate: string
  readonly submittedDate?: string
  readonly settlementStatus: PortfolioSettlementStatus
  readonly source: PortfolioEventSource
  readonly auditedAt: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface PortfolioBuyEvent extends PortfolioEventBase {
  readonly kind: 'buy'
  readonly totalAmount: MoneyFieldValue
  readonly units: UnitsFieldValue
  readonly unitNav: NavFieldValue
  readonly purchaseFee: MoneyFieldValue
  readonly purchaseFeeRate: FieldValue<number>
}

export interface PortfolioSellEvent extends PortfolioEventBase {
  readonly kind: 'sell'
  readonly units: UnitsFieldValue
  readonly unitNav?: NavFieldValue
  readonly grossAmount?: MoneyFieldValue
  readonly netAmount?: MoneyFieldValue
  readonly redemptionFee?: MoneyFieldValue
}

export interface PortfolioCashDividendEvent extends PortfolioEventBase {
  readonly kind: 'cash-dividend'
  readonly cashAmount: MoneyFieldValue
}

export interface PortfolioDividendReinvestmentEvent extends PortfolioEventBase {
  readonly kind: 'dividend-reinvestment'
  readonly dividendAmount: MoneyFieldValue
  readonly units: UnitsFieldValue
  readonly unitNav: NavFieldValue
}

export interface PortfolioInitialHoldingEvent extends PortfolioEventBase {
  readonly kind: 'initial-holding'
  readonly units: UnitsFieldValue
  readonly costAmount: MoneyFieldValue
}

export interface PortfolioAdjustmentEvent extends PortfolioEventBase {
  readonly kind: 'adjustment'
  readonly unitsDelta: UnitsFieldValue
  readonly costAmountDelta: MoneyFieldValue
  readonly reason: string
}

export type PortfolioEvent =
  | PortfolioBuyEvent
  | PortfolioSellEvent
  | PortfolioCashDividendEvent
  | PortfolioDividendReinvestmentEvent
  | PortfolioInitialHoldingEvent
  | PortfolioAdjustmentEvent

export interface PortfolioBatch {
  readonly id: string
  readonly eventId: string
  readonly fundCode: string
  readonly confirmedDate: string
  readonly units: UnitsFieldValue
  readonly costAmount: MoneyFieldValue
}

export interface Portfolio {
  readonly fundCodes: readonly string[]
  readonly events: readonly PortfolioEvent[]
}
