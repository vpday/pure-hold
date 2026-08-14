import type {
  FieldValue,
  MoneyFieldValue,
  NavFieldValue,
  PortfolioAdjustmentEvent,
  PortfolioBuyEvent,
  PortfolioCashDividendEvent,
  PortfolioDividendReinvestmentEvent,
  PortfolioEvent,
  PortfolioInitialHoldingEvent,
  PortfolioSellEvent,
  UnitsFieldValue,
} from '../models/index.ts'

export interface PortfolioNavPoint {
  readonly date: string
  readonly unitNav: NavFieldValue
}

export type CurrentNavByFund = Readonly<Record<string, PortfolioNavPoint | undefined>>

export type PortfolioPendingFact =
  | 'adjustment-cost-amount'
  | 'adjustment-units'
  | 'cash-amount'
  | 'dividend-amount'
  | 'purchase-fee-rate'
  | 'reinvestment-units'
  | 'total-amount'
  | 'unit-nav'
  | 'units'

export type PortfolioCalculationIssueCode =
  | 'insufficient-adjustment-units'
  | 'insufficient-units'
  | 'missing-sell-units'

export interface PortfolioBuyCalculation {
  readonly eventId: string
  readonly fundCode: string
  readonly settlementStatus: 'pending-settlement' | 'settled'
  readonly totalAmount: MoneyFieldValue
  readonly purchaseFeeRate: FieldValue<number>
  readonly unitNav: NavFieldValue
  readonly netPurchaseAmount: MoneyFieldValue
  readonly purchaseFee: MoneyFieldValue
  readonly units: UnitsFieldValue
}

export interface PortfolioCashDividendCalculation {
  readonly eventId: string
  readonly fundCode: string
  readonly settlementStatus: 'pending-settlement' | 'settled'
  readonly cashAmount: MoneyFieldValue
}

export interface PortfolioDividendReinvestmentCalculation {
  readonly eventId: string
  readonly fundCode: string
  readonly settlementStatus: 'pending-settlement' | 'settled'
  readonly dividendAmount: MoneyFieldValue
  readonly units: UnitsFieldValue
  readonly unitNav: NavFieldValue
}

export interface PortfolioAdjustmentCalculation {
  readonly eventId: string
  readonly fundCode: string
  readonly settlementStatus: 'pending-settlement' | 'settled'
  readonly unitsDelta: UnitsFieldValue
  readonly costAmountDelta: MoneyFieldValue
  readonly reason: string
}

export interface PortfolioPendingSettlement {
  readonly eventId: string
  readonly fundCode: string
  readonly totalAmount?: MoneyFieldValue
  readonly missingFacts: readonly PortfolioPendingFact[]
}

export interface PortfolioBatchCalculation {
  readonly eventId: string
  readonly fundCode: string
  readonly confirmedDate: string
  readonly units: UnitsFieldValue
  readonly costAmount: MoneyFieldValue
}

export interface PortfolioSellAllocation {
  readonly buyEventId: string
  readonly sellEventId: string
  readonly units: UnitsFieldValue
  readonly costAmount: MoneyFieldValue
}

export interface PortfolioSellCalculation {
  readonly eventId: string
  readonly fundCode: string
  readonly settlementStatus: 'pending-settlement' | 'settled'
  readonly units: UnitsFieldValue
  readonly unitNav: NavFieldValue
  readonly grossAmount: MoneyFieldValue
  readonly redemptionFee: MoneyFieldValue
  readonly netAmount: MoneyFieldValue
  readonly allocatedCostAmount: MoneyFieldValue
  readonly realizedGain: MoneyFieldValue
  readonly realizedGainStatus: 'complete' | 'incomplete'
}

export interface PortfolioCalculationIssue {
  readonly eventId: string
  readonly fundCode: string
  readonly code: PortfolioCalculationIssueCode
  readonly requestedUnits: UnitsFieldValue
  readonly availableUnits: UnitsFieldValue
}

export interface PortfolioFundSummary {
  readonly cashDividend: MoneyFieldValue
  readonly cashInvested: MoneyFieldValue
  readonly costAmount: MoneyFieldValue
  readonly marketValue: MoneyFieldValue
  readonly realizedGain: MoneyFieldValue
  readonly sellProceeds: MoneyFieldValue
  readonly totalAmount: MoneyFieldValue
  readonly totalGain: MoneyFieldValue
  readonly netPurchaseAmount: MoneyFieldValue
  readonly purchaseFee: MoneyFieldValue
  readonly units: UnitsFieldValue
  readonly unrealizedGain: MoneyFieldValue
}

export interface PortfolioSummary {
  readonly byFund: Readonly<Record<string, PortfolioFundSummary>>
}

export interface PortfolioCalculation {
  readonly asOfDate: string
  readonly cashDividendEvents: readonly PortfolioCashDividendCalculation[]
  readonly dividendReinvestmentEvents: readonly PortfolioDividendReinvestmentCalculation[]
  readonly adjustmentEvents: readonly PortfolioAdjustmentCalculation[]
  readonly events: readonly PortfolioBuyCalculation[]
  readonly sellEvents: readonly PortfolioSellCalculation[]
  readonly batches: readonly PortfolioBatchCalculation[]
  readonly sellAllocations: readonly PortfolioSellAllocation[]
  readonly issues: readonly PortfolioCalculationIssue[]
  readonly confirmedSummary: PortfolioSummary
  readonly estimatedSummary: PortfolioSummary
  readonly pendingSettlement: readonly PortfolioPendingSettlement[]
}

export interface PortfolioCalculationInput {
  readonly events: readonly PortfolioEvent[]
  readonly currentNavByFund: CurrentNavByFund
  readonly asOfDate: string
}

interface CalculatedBuy extends PortfolioBuyCalculation {
  readonly event: PortfolioBuyEvent
}

interface CalculatedSell extends PortfolioSellCalculation {
  readonly event: PortfolioSellEvent
  readonly allocations: readonly PortfolioSellAllocation[]
}

interface WorkingBatch {
  readonly eventId: string
  readonly fundCode: string
  readonly confirmedDate: string
  units: number
  unitsConfidence: UnitsFieldValue['confidence']
  unitsSource: UnitsFieldValue['source']
  costAmount: number
  costConfidence: MoneyFieldValue['confidence']
  costSource: MoneyFieldValue['source']
}

interface FieldAccumulator {
  total: number
  hasValue: boolean
  hasUnknown: boolean
  hasEstimated: boolean
}

interface SummaryAccumulator {
  cashDividend: FieldAccumulator
  cashInvested: FieldAccumulator
  costAmount: FieldAccumulator
  currentUnits: FieldAccumulator
  realizedGain: FieldAccumulator
  sellProceeds: FieldAccumulator
  totalAmount: FieldAccumulator
  netPurchaseAmount: FieldAccumulator
  purchaseFee: FieldAccumulator
  units: FieldAccumulator
}

const FORMULA_SOURCE = 'formula' as const
const NAV_SOURCE = 'nav-history' as const

export function calculatePortfolio({
  events,
  currentNavByFund,
  asOfDate,
}: PortfolioCalculationInput): PortfolioCalculation {
  const calculatedBuys = events
    .filter(isBuyEvent)
    .map((event) => calculateBuy(event, currentNavByFund[event.fundCode]))
  const calculatedCashDividends = events.filter(isCashDividendEvent).map(calculateCashDividend)
  const calculatedDividendReinvestments = events
    .filter(isDividendReinvestmentEvent)
    .map(calculateDividendReinvestment)
  const dividendReinvestmentsById = new Map(
    calculatedDividendReinvestments.map((event) => [event.eventId, event]),
  )
  const calculatedAdjustments = events.filter(isAdjustmentEvent).map(calculateAdjustment)
  const adjustmentsById = new Map(calculatedAdjustments.map((event) => [event.eventId, event]))
  const buysById = new Map(calculatedBuys.map((event) => [event.eventId, event]))
  const workingBatches: WorkingBatch[] = []
  const sellCalculations = new Map<string, CalculatedSell>()
  const sellAllocations: PortfolioSellAllocation[] = []
  const issues: PortfolioCalculationIssue[] = []

  for (const { event } of orderEvents(events)) {
    if (isBuyEvent(event)) {
      const calculated = buysById.get(event.id)
      if (calculated?.settlementStatus === 'settled' && event.settlementStatus === 'settled') {
        workingBatches.push(toWorkingBatch(calculated))
      }
      continue
    }
    if (isInitialHoldingEvent(event)) {
      if (
        event.settlementStatus === 'settled' &&
        event.units.value !== null &&
        event.costAmount.value !== null
      ) {
        workingBatches.push(toWorkingBatchFromInitialHolding(event))
      }
      continue
    }
    if (isDividendReinvestmentEvent(event)) {
      const calculated = dividendReinvestmentsById.get(event.id)
      if (calculated?.settlementStatus === 'settled' && event.settlementStatus === 'settled') {
        workingBatches.push(toWorkingBatchFromDividendReinvestment(calculated, event.confirmedDate))
      }
      continue
    }
    if (isAdjustmentEvent(event)) {
      const calculated = adjustmentsById.get(event.id)
      if (calculated?.settlementStatus === 'settled' && event.settlementStatus === 'settled') {
        const unitsDelta = calculated.unitsDelta.value
        if (
          unitsDelta !== null &&
          unitsDelta < -UNIT_EPSILON &&
          availableUnitsFor(workingBatches, event.fundCode) + UNIT_EPSILON < Math.abs(unitsDelta)
        ) {
          issues.push({
            availableUnits: valueField(
              availableUnitsFor(workingBatches, event.fundCode),
              'estimated',
              FORMULA_SOURCE,
            ),
            code: 'insufficient-adjustment-units',
            eventId: calculated.eventId,
            fundCode: calculated.fundCode,
            requestedUnits: cloneField(calculated.unitsDelta),
          })
          adjustmentsById.set(event.id, {
            ...calculated,
            settlementStatus: 'pending-settlement',
          })
          continue
        }
        applyAdjustment(workingBatches, calculated, event.confirmedDate)
      }
      continue
    }
    if (!isSellEvent(event)) continue

    const calculated = calculateSell(event, currentNavByFund[event.fundCode])
    if (event.settlementStatus !== 'settled') {
      sellCalculations.set(event.id, calculated)
      continue
    }
    if (calculated.units.value === null) {
      issues.push({
        availableUnits: unknownField(FORMULA_SOURCE),
        code: 'missing-sell-units',
        eventId: calculated.eventId,
        fundCode: calculated.fundCode,
        requestedUnits: cloneField(calculated.units),
      })
      sellCalculations.set(event.id, { ...calculated, settlementStatus: 'pending-settlement' })
      continue
    }

    const availableUnits = availableUnitsFor(workingBatches, event.fundCode)
    if (availableUnits + UNIT_EPSILON < calculated.units.value) {
      issues.push({
        availableUnits: valueField(availableUnits, 'estimated', FORMULA_SOURCE),
        code: 'insufficient-units',
        eventId: calculated.eventId,
        fundCode: calculated.fundCode,
        requestedUnits: cloneField(calculated.units),
      })
      sellCalculations.set(event.id, { ...calculated, settlementStatus: 'pending-settlement' })
      continue
    }

    const allocations = consumeFifo(workingBatches, event.fundCode, event.id, calculated.units)
    sellAllocations.push(...allocations)
    sellCalculations.set(
      event.id,
      completeSellCalculation(calculated, allocations, allocationCost(allocations)),
    )
  }

  const settledEvents = calculatedBuys.filter((event) => event.settlementStatus === 'settled')
  const confirmedEvents = settledEvents.filter(
    (event) => event.totalAmount.confidence === 'actual' && event.units.confidence === 'actual',
  )
  const settledCashDividends = calculatedCashDividends.filter(
    (event) => event.settlementStatus === 'settled',
  )
  const confirmedCashDividends = settledCashDividends.filter(
    (event) => event.cashAmount.confidence === 'actual',
  )
  const calculatedAdjustmentEvents = calculatedAdjustments.map(
    (event) => adjustmentsById.get(event.eventId) ?? event,
  )
  const pendingSettlements = new Map<string, PortfolioPendingSettlement>()
  for (const event of calculatedBuys.filter(
    (event) => event.settlementStatus === 'pending-settlement',
  )) {
    pendingSettlements.set(event.eventId, toPendingSettlement(event))
  }
  for (const event of calculatedCashDividends.filter(
    (event) => event.settlementStatus === 'pending-settlement',
  )) {
    pendingSettlements.set(event.eventId, toPendingCashDividendSettlement(event))
  }
  for (const event of calculatedDividendReinvestments.filter(
    (event) => event.settlementStatus === 'pending-settlement',
  )) {
    pendingSettlements.set(event.eventId, toPendingDividendReinvestmentSettlement(event))
  }
  for (const event of calculatedAdjustmentEvents.filter(
    (event) => event.settlementStatus === 'pending-settlement',
  )) {
    pendingSettlements.set(event.eventId, toPendingAdjustmentSettlement(event))
  }
  for (const event of [...sellCalculations.values()].filter(
    (event) => event.settlementStatus === 'pending-settlement',
  )) {
    pendingSettlements.set(event.eventId, toPendingSellSettlement(event))
  }
  const calculatedSellEvents = events.filter(isSellEvent).map((event) => {
    const {
      event: _event,
      allocations: _allocations,
      ...calculation
    } = sellCalculations.get(event.id) ?? calculateSell(event, currentNavByFund[event.fundCode])
    return calculation
  })
  const settledSellEvents = calculatedSellEvents.filter(
    (event) => event.settlementStatus === 'settled',
  )
  const confirmedSellEvents = settledSellEvents.filter(
    (event) => event.units.confidence === 'actual',
  )

  return {
    asOfDate,
    batches: workingBatches.filter(({ units }) => units > UNIT_EPSILON).map(toBatchCalculation),
    cashDividendEvents: calculatedCashDividends,
    confirmedSummary: createSummary(
      confirmedEvents,
      confirmedCashDividends,
      workingBatches.filter(
        ({ unitsConfidence, costConfidence }) =>
          unitsConfidence === 'actual' && costConfidence === 'actual',
      ),
      confirmedSellEvents,
      currentNavByFund,
    ),
    dividendReinvestmentEvents: calculatedDividendReinvestments,
    adjustmentEvents: calculatedAdjustmentEvents,
    estimatedSummary: createSummary(
      settledEvents,
      settledCashDividends,
      workingBatches,
      settledSellEvents,
      currentNavByFund,
    ),
    events: calculatedBuys.map(({ event: _event, ...calculation }) => calculation),
    issues,
    pendingSettlement: events.flatMap((event) => {
      const pending = pendingSettlements.get(event.id)
      return pending === undefined ? [] : [pending]
    }),
    sellAllocations,
    sellEvents: calculatedSellEvents,
  }
}

function orderEvents(events: readonly PortfolioEvent[]) {
  return events
    .map((event, index) => ({ event, index }))
    .sort(
      (left, right) =>
        left.event.confirmedDate.localeCompare(right.event.confirmedDate) ||
        left.index - right.index,
    )
}

function calculateBuy(
  event: PortfolioBuyEvent,
  navPoint: PortfolioNavPoint | undefined,
): CalculatedBuy {
  const totalAmount = cloneField(event.totalAmount)
  const purchaseFeeRate = cloneField(event.purchaseFeeRate)
  const unitNav = resolveUnitNav(event, navPoint)
  const purchaseFee = resolvePurchaseFee(event, totalAmount, purchaseFeeRate)
  const netPurchaseAmount = resolveNetPurchaseAmount(totalAmount, purchaseFee)
  const units = resolveUnits(event, netPurchaseAmount, unitNav)
  const settlementStatus =
    event.settlementStatus === 'settled' && totalAmount.value !== null && units.value !== null
      ? 'settled'
      : 'pending-settlement'

  return {
    event,
    eventId: event.id,
    fundCode: event.fundCode,
    netPurchaseAmount,
    purchaseFee,
    purchaseFeeRate,
    settlementStatus,
    totalAmount,
    unitNav,
    units,
  }
}

function calculateCashDividend(
  event: PortfolioCashDividendEvent,
): PortfolioCashDividendCalculation {
  return {
    cashAmount: cloneField(event.cashAmount),
    eventId: event.id,
    fundCode: event.fundCode,
    settlementStatus:
      event.settlementStatus === 'settled' && event.cashAmount.value !== null
        ? 'settled'
        : 'pending-settlement',
  }
}

function calculateDividendReinvestment(
  event: PortfolioDividendReinvestmentEvent,
): PortfolioDividendReinvestmentCalculation {
  return {
    dividendAmount: cloneField(event.dividendAmount),
    eventId: event.id,
    fundCode: event.fundCode,
    settlementStatus:
      event.settlementStatus === 'settled' &&
      event.dividendAmount.value !== null &&
      event.units.value !== null
        ? 'settled'
        : 'pending-settlement',
    unitNav: cloneField(event.unitNav),
    units: cloneField(event.units),
  }
}

function calculateAdjustment(event: PortfolioAdjustmentEvent): PortfolioAdjustmentCalculation {
  return {
    costAmountDelta: cloneField(event.costAmountDelta),
    eventId: event.id,
    fundCode: event.fundCode,
    reason: event.reason,
    settlementStatus:
      event.settlementStatus === 'settled' &&
      event.unitsDelta.value !== null &&
      event.costAmountDelta.value !== null
        ? 'settled'
        : 'pending-settlement',
    unitsDelta: cloneField(event.unitsDelta),
  }
}

function calculateSell(
  event: PortfolioSellEvent,
  navPoint: PortfolioNavPoint | undefined,
): CalculatedSell {
  const units = cloneField(event.units)
  const unitNav = resolveUnitNav(event, navPoint)
  const grossAmount = resolveGrossAmount(event, units, unitNav)
  const redemptionFee = resolveRedemptionFee(event)
  const netAmount = resolveNetAmount(event, grossAmount, redemptionFee)
  const settlementStatus =
    event.settlementStatus === 'settled' && units.value !== null ? 'settled' : 'pending-settlement'
  return {
    allocatedCostAmount: unknownField(FORMULA_SOURCE),
    allocations: [],
    event,
    eventId: event.id,
    fundCode: event.fundCode,
    grossAmount,
    netAmount,
    realizedGain: unknownField(FORMULA_SOURCE),
    realizedGainStatus: 'incomplete',
    redemptionFee,
    settlementStatus,
    unitNav,
    units,
  }
}

function completeSellCalculation(
  calculation: CalculatedSell,
  allocations: readonly PortfolioSellAllocation[],
  allocatedCostAmount: MoneyFieldValue,
): CalculatedSell {
  const gainIsComplete =
    calculation.netAmount.value !== null &&
    (calculation.netAmount.confidence === 'actual' ||
      calculation.redemptionFee.confidence === 'actual')
  return {
    ...calculation,
    allocatedCostAmount,
    allocations,
    realizedGain: gainIsComplete
      ? valueField(
          calculation.netAmount.value - (allocatedCostAmount.value ?? 0),
          'estimated',
          FORMULA_SOURCE,
        )
      : unknownField(FORMULA_SOURCE),
    realizedGainStatus: gainIsComplete ? 'complete' : 'incomplete',
  }
}

function resolveGrossAmount(
  event: PortfolioSellEvent,
  units: UnitsFieldValue,
  unitNav: NavFieldValue,
): MoneyFieldValue {
  if (event.grossAmount !== undefined) {
    return isUsableAmount(event.grossAmount)
      ? cloneField(event.grossAmount)
      : unknownField(event.grossAmount.source)
  }
  if (units.value !== null && isValidNav(unitNav.value)) {
    return valueField(roundMoney(units.value * unitNav.value * 100), 'estimated', FORMULA_SOURCE)
  }
  return unknownField(FORMULA_SOURCE)
}

function resolveRedemptionFee(event: PortfolioSellEvent): MoneyFieldValue {
  if (event.redemptionFee === undefined) return unknownField(FORMULA_SOURCE)
  return isUsableAmount(event.redemptionFee)
    ? cloneField(event.redemptionFee)
    : unknownField(event.redemptionFee.source)
}

function resolveNetAmount(
  event: PortfolioSellEvent,
  grossAmount: MoneyFieldValue,
  redemptionFee: MoneyFieldValue,
): MoneyFieldValue {
  if (event.netAmount !== undefined) {
    return isUsableAmount(event.netAmount)
      ? cloneField(event.netAmount)
      : unknownField(event.netAmount.source)
  }
  if (
    grossAmount.value !== null &&
    redemptionFee.value !== null &&
    redemptionFee.confidence === 'actual'
  ) {
    return valueField(grossAmount.value - redemptionFee.value, 'estimated', FORMULA_SOURCE)
  }
  return unknownField(FORMULA_SOURCE)
}

function toWorkingBatch(event: CalculatedBuy): WorkingBatch {
  return {
    confirmedDate: event.event.confirmedDate,
    costAmount: event.totalAmount.value as number,
    costConfidence: event.totalAmount.confidence,
    costSource: event.totalAmount.source,
    eventId: event.eventId,
    fundCode: event.fundCode,
    units: event.units.value as number,
    unitsConfidence: event.units.confidence,
    unitsSource: event.units.source,
  }
}

function toWorkingBatchFromInitialHolding(event: PortfolioInitialHoldingEvent): WorkingBatch {
  return {
    confirmedDate: event.confirmedDate,
    costAmount: event.costAmount.value as number,
    costConfidence: event.costAmount.confidence,
    costSource: event.costAmount.source,
    eventId: event.id,
    fundCode: event.fundCode,
    units: event.units.value as number,
    unitsConfidence: event.units.confidence,
    unitsSource: event.units.source,
  }
}

function toWorkingBatchFromDividendReinvestment(
  event: PortfolioDividendReinvestmentCalculation,
  confirmedDate: string,
): WorkingBatch {
  return {
    confirmedDate,
    costAmount: event.dividendAmount.value as number,
    costConfidence: event.dividendAmount.confidence,
    costSource: event.dividendAmount.source,
    eventId: event.eventId,
    fundCode: event.fundCode,
    units: event.units.value as number,
    unitsConfidence: event.units.confidence,
    unitsSource: event.units.source,
  }
}

function applyAdjustment(
  batches: WorkingBatch[],
  event: PortfolioAdjustmentCalculation,
  confirmedDate: string,
): void {
  const unitsDelta = event.unitsDelta.value as number
  const costAmountDelta = event.costAmountDelta.value as number
  if (unitsDelta > UNIT_EPSILON) {
    batches.push({
      confirmedDate,
      costAmount: costAmountDelta,
      costConfidence: event.costAmountDelta.confidence,
      costSource: event.costAmountDelta.source,
      eventId: event.eventId,
      fundCode: event.fundCode,
      units: unitsDelta,
      unitsConfidence: event.unitsDelta.confidence,
      unitsSource: event.unitsDelta.source,
    })
    return
  }

  let remainingUnits = Math.abs(unitsDelta)
  let costTarget: WorkingBatch | undefined
  for (let index = batches.length - 1; index >= 0 && remainingUnits > UNIT_EPSILON; index -= 1) {
    const batch = batches[index]
    if (batch.fundCode !== event.fundCode) continue
    const removedUnits = Math.min(remainingUnits, batch.units)
    batch.units -= removedUnits
    costTarget = batch
    remainingUnits -= removedUnits
  }
  if (costTarget === undefined && Math.abs(costAmountDelta) > UNIT_EPSILON) {
    costTarget = [...batches].reverse().find(({ fundCode }) => fundCode === event.fundCode)
  }
  if (costTarget !== undefined && Math.abs(costAmountDelta) > UNIT_EPSILON) {
    costTarget.costAmount += costAmountDelta
    costTarget.costConfidence = event.costAmountDelta.confidence
    costTarget.costSource = event.costAmountDelta.source
  }
}

function availableUnitsFor(batches: readonly WorkingBatch[], fundCode: string): number {
  return batches
    .filter((batch) => batch.fundCode === fundCode)
    .reduce((total, batch) => total + batch.units, 0)
}

function consumeFifo(
  batches: WorkingBatch[],
  fundCode: string,
  sellEventId: string,
  requestedUnits: UnitsFieldValue,
): PortfolioSellAllocation[] {
  let remaining = requestedUnits.value as number
  const allocations: PortfolioSellAllocation[] = []
  for (const batch of batches) {
    if (batch.fundCode !== fundCode || batch.units <= UNIT_EPSILON || remaining <= UNIT_EPSILON) {
      continue
    }
    const consumedUnits = Math.min(remaining, batch.units)
    const costAmount =
      consumedUnits >= batch.units - UNIT_EPSILON
        ? batch.costAmount
        : roundMoney((batch.costAmount * consumedUnits) / batch.units)
    const costConfidence =
      consumedUnits >= batch.units - UNIT_EPSILON ? batch.costConfidence : 'estimated'
    const costSource =
      consumedUnits >= batch.units - UNIT_EPSILON ? batch.costSource : FORMULA_SOURCE
    allocations.push({
      buyEventId: batch.eventId,
      costAmount: valueField(costAmount, costConfidence, costSource),
      sellEventId,
      units: valueField(
        consumedUnits,
        requestedUnits.confidence === 'actual' && batch.unitsConfidence === 'actual'
          ? 'actual'
          : 'estimated',
        FORMULA_SOURCE,
      ),
    })
    batch.units -= consumedUnits
    batch.costAmount -= costAmount
    remaining -= consumedUnits
  }
  return allocations
}

function allocationCost(allocations: readonly PortfolioSellAllocation[]): MoneyFieldValue {
  if (allocations.length === 0) return valueField(0, 'actual', FORMULA_SOURCE)
  const confidence = allocations.every(({ costAmount }) => costAmount.confidence === 'actual')
    ? 'actual'
    : 'estimated'
  return valueField(
    allocations.reduce((total, allocation) => total + (allocation.costAmount.value ?? 0), 0),
    confidence,
    FORMULA_SOURCE,
  )
}

function toBatchCalculation(batch: WorkingBatch): PortfolioBatchCalculation {
  return {
    confirmedDate: batch.confirmedDate,
    costAmount: valueField(batch.costAmount, batch.costConfidence, batch.costSource),
    eventId: batch.eventId,
    fundCode: batch.fundCode,
    units: valueField(batch.units, batch.unitsConfidence, batch.unitsSource),
  }
}

function resolveUnitNav(
  event: PortfolioBuyEvent | PortfolioSellEvent,
  navPoint: PortfolioNavPoint | undefined,
): NavFieldValue {
  if (event.unitNav?.confidence === 'actual') {
    return isValidNav(event.unitNav.value)
      ? cloneField(event.unitNav)
      : unknownField(event.unitNav.source)
  }
  if (
    navPoint !== undefined &&
    navPoint.date === event.confirmedDate &&
    isValidNav(navPoint.unitNav.value)
  ) {
    return cloneField(navPoint.unitNav)
  }
  return unknownField(NAV_SOURCE)
}

function resolvePurchaseFee(
  event: PortfolioBuyEvent,
  totalAmount: MoneyFieldValue,
  purchaseFeeRate: FieldValue<number>,
): MoneyFieldValue {
  if (event.purchaseFee.confidence === 'actual' && isNonNegativeFinite(event.purchaseFee.value)) {
    return cloneField(event.purchaseFee)
  }
  if (
    totalAmount.value !== null &&
    purchaseFeeRate.value !== null &&
    isValidRate(purchaseFeeRate.value)
  ) {
    const netAmount = roundMoney(totalAmount.value / (1 + purchaseFeeRate.value / 100))
    return valueField(totalAmount.value - netAmount, 'estimated', FORMULA_SOURCE)
  }
  return unknownField(FORMULA_SOURCE)
}

function isUsableAmount(field: MoneyFieldValue): boolean {
  return field.value !== null && Number.isFinite(field.value) && field.value >= 0
}

function resolveNetPurchaseAmount(
  totalAmount: MoneyFieldValue,
  purchaseFee: MoneyFieldValue,
): MoneyFieldValue {
  if (totalAmount.value !== null && purchaseFee.value !== null) {
    return valueField(totalAmount.value - purchaseFee.value, 'estimated', FORMULA_SOURCE)
  }
  return unknownField(FORMULA_SOURCE)
}

function resolveUnits(
  event: PortfolioBuyEvent,
  netPurchaseAmount: MoneyFieldValue,
  unitNav: NavFieldValue,
): UnitsFieldValue {
  if (event.units.confidence === 'actual' && isNonNegativeFinite(event.units.value)) {
    return cloneField(event.units)
  }
  if (netPurchaseAmount.value !== null && isValidNav(unitNav.value)) {
    return valueField(
      roundUnits(netPurchaseAmount.value / 100 / unitNav.value),
      'estimated',
      FORMULA_SOURCE,
    )
  }
  return unknownField(FORMULA_SOURCE)
}

function toPendingSettlement(event: CalculatedBuy): PortfolioPendingSettlement {
  const missingFacts: PortfolioPendingFact[] = []
  if (event.totalAmount.value === null) missingFacts.push('total-amount')
  if (event.purchaseFee.value === null) missingFacts.push('purchase-fee-rate')
  if (event.unitNav.value === null) missingFacts.push('unit-nav')
  if (event.units.value === null) missingFacts.push('units')
  return {
    eventId: event.eventId,
    fundCode: event.fundCode,
    missingFacts,
    totalAmount: cloneField(event.totalAmount),
  }
}

function toPendingCashDividendSettlement(
  event: PortfolioCashDividendCalculation,
): PortfolioPendingSettlement {
  const missingFacts: PortfolioPendingFact[] = []
  if (event.cashAmount.value === null) missingFacts.push('cash-amount')
  return {
    eventId: event.eventId,
    fundCode: event.fundCode,
    missingFacts,
  }
}

function toPendingDividendReinvestmentSettlement(
  event: PortfolioDividendReinvestmentCalculation,
): PortfolioPendingSettlement {
  const missingFacts: PortfolioPendingFact[] = []
  if (event.dividendAmount.value === null) missingFacts.push('dividend-amount')
  if (event.units.value === null) missingFacts.push('reinvestment-units')
  return {
    eventId: event.eventId,
    fundCode: event.fundCode,
    missingFacts,
  }
}

function toPendingAdjustmentSettlement(
  event: PortfolioAdjustmentCalculation,
): PortfolioPendingSettlement {
  const missingFacts: PortfolioPendingFact[] = []
  if (event.unitsDelta.value === null) missingFacts.push('adjustment-units')
  if (event.costAmountDelta.value === null) missingFacts.push('adjustment-cost-amount')
  return {
    eventId: event.eventId,
    fundCode: event.fundCode,
    missingFacts,
  }
}

function toPendingSellSettlement(event: CalculatedSell): PortfolioPendingSettlement {
  return {
    eventId: event.eventId,
    fundCode: event.fundCode,
    missingFacts: event.units.value === null ? ['units'] : [],
  }
}

function createSummary(
  events: readonly PortfolioBuyCalculation[],
  cashDividendEvents: readonly PortfolioCashDividendCalculation[] = [],
  batches: readonly WorkingBatch[] = [],
  sellEvents: readonly PortfolioSellCalculation[] = [],
  currentNavByFund: CurrentNavByFund = {},
): PortfolioSummary {
  const summaries = new Map<string, SummaryAccumulator>()
  for (const event of events) {
    const summary = summaries.get(event.fundCode) ?? createSummaryAccumulator()
    addField(summary.cashInvested, event.totalAmount)
    addField(summary.totalAmount, event.totalAmount)
    addField(summary.netPurchaseAmount, event.netPurchaseAmount)
    addField(summary.purchaseFee, event.purchaseFee)
    addField(summary.units, event.units)
    summaries.set(event.fundCode, summary)
  }
  for (const event of cashDividendEvents) {
    const summary = summaries.get(event.fundCode) ?? createSummaryAccumulator()
    addField(summary.cashDividend, event.cashAmount)
    summaries.set(event.fundCode, summary)
  }
  for (const batch of batches) {
    const summary = summaries.get(batch.fundCode) ?? createSummaryAccumulator()
    addField(
      summary.currentUnits,
      valueField(batch.units, batch.unitsConfidence, batch.unitsSource),
    )
    addField(
      summary.costAmount,
      valueField(batch.costAmount, batch.costConfidence, batch.costSource),
    )
    summaries.set(batch.fundCode, summary)
  }
  for (const event of sellEvents) {
    const summary = summaries.get(event.fundCode) ?? createSummaryAccumulator()
    addField(summary.sellProceeds, event.netAmount)
    addField(summary.realizedGain, event.realizedGain)
    summaries.set(event.fundCode, summary)
  }

  const byFund: Record<string, PortfolioFundSummary> = {}
  for (const [fundCode, summary] of summaries) {
    const units = toSummaryField(summary.currentUnits)
    const costAmount = toSummaryField(summary.costAmount)
    const marketValue = resolveMarketValue(units, currentNavByFund[fundCode])
    const unrealizedGain = deriveDifference(marketValue, costAmount)
    const cashDividend = toSummaryField(summary.cashDividend)
    const realizedGain = toSummaryField(summary.realizedGain)
    byFund[fundCode] = {
      cashDividend,
      cashInvested: toSummaryField(summary.cashInvested),
      costAmount,
      marketValue,
      realizedGain,
      sellProceeds: toSummaryField(summary.sellProceeds),
      totalGain: deriveSum([cashDividend, realizedGain, unrealizedGain]),
      netPurchaseAmount: toSummaryField(summary.netPurchaseAmount),
      purchaseFee: toSummaryField(summary.purchaseFee),
      totalAmount: toSummaryField(summary.totalAmount),
      units,
      unrealizedGain,
    }
  }
  return { byFund }
}

function createSummaryAccumulator(): SummaryAccumulator {
  return {
    cashDividend: createZeroFieldAccumulator(),
    cashInvested: createZeroFieldAccumulator(),
    costAmount: createFieldAccumulator(),
    currentUnits: createFieldAccumulator(),
    netPurchaseAmount: createFieldAccumulator(),
    purchaseFee: createFieldAccumulator(),
    realizedGain: createZeroFieldAccumulator(),
    sellProceeds: createZeroFieldAccumulator(),
    totalAmount: createFieldAccumulator(),
    units: createFieldAccumulator(),
  }
}

function createFieldAccumulator(): FieldAccumulator {
  return { hasEstimated: false, hasUnknown: false, hasValue: false, total: 0 }
}

function createZeroFieldAccumulator(): FieldAccumulator {
  return { hasEstimated: false, hasUnknown: false, hasValue: true, total: 0 }
}

function addField<T>(accumulator: FieldAccumulator, field: FieldValue<T>): void {
  if (field.value === null) {
    accumulator.hasUnknown = true
    return
  }
  if (typeof field.value !== 'number' || !Number.isFinite(field.value)) {
    accumulator.hasUnknown = true
    return
  }
  accumulator.hasValue = true
  accumulator.total += field.value
  if (field.confidence === 'estimated') accumulator.hasEstimated = true
}

function toSummaryField(accumulator: FieldAccumulator): FieldValue<number> {
  if (accumulator.hasUnknown || !accumulator.hasValue) return unknownField(FORMULA_SOURCE)
  return valueField(
    accumulator.total,
    accumulator.hasEstimated ? 'estimated' : 'actual',
    FORMULA_SOURCE,
  )
}

function resolveMarketValue(
  units: FieldValue<number>,
  navPoint: PortfolioNavPoint | undefined,
): MoneyFieldValue {
  if (
    units.value === null ||
    navPoint === undefined ||
    navPoint.unitNav.confidence === 'unknown' ||
    !isValidNav(navPoint.unitNav.value)
  ) {
    return unknownField(FORMULA_SOURCE)
  }
  return valueField(
    roundMoney(units.value * navPoint.unitNav.value * 100),
    'estimated',
    FORMULA_SOURCE,
  )
}

function deriveDifference(
  minuend: FieldValue<number>,
  subtrahend: FieldValue<number>,
): MoneyFieldValue {
  if (minuend.value === null || subtrahend.value === null) {
    return unknownField(FORMULA_SOURCE)
  }
  return valueField(minuend.value - subtrahend.value, 'estimated', FORMULA_SOURCE)
}

function deriveSum(fields: readonly FieldValue<number>[]): MoneyFieldValue {
  if (fields.some(({ value }) => value === null)) return unknownField(FORMULA_SOURCE)
  return valueField(
    fields.reduce((total, field) => total + (field.value as number), 0),
    'estimated',
    FORMULA_SOURCE,
  )
}

function cloneField<T>(field: FieldValue<T>): FieldValue<T> {
  return { confidence: field.confidence, source: field.source, value: field.value }
}

function valueField<T>(
  value: T,
  confidence: FieldValue<T>['confidence'],
  source: FieldValue<T>['source'],
): FieldValue<T> {
  return { confidence, source, value }
}

function isCashDividendEvent(event: PortfolioEvent): event is PortfolioCashDividendEvent {
  return event.kind === 'cash-dividend'
}

function isDividendReinvestmentEvent(
  event: PortfolioEvent,
): event is PortfolioDividendReinvestmentEvent {
  return event.kind === 'dividend-reinvestment'
}

function isAdjustmentEvent(event: PortfolioEvent): event is PortfolioAdjustmentEvent {
  return event.kind === 'adjustment'
}

function unknownField<T>(source: FieldValue<T>['source']): FieldValue<T> {
  return { confidence: 'unknown', source, value: null }
}

function isBuyEvent(event: PortfolioEvent): event is PortfolioBuyEvent {
  return event.kind === 'buy'
}

function isInitialHoldingEvent(event: PortfolioEvent): event is PortfolioInitialHoldingEvent {
  return event.kind === 'initial-holding'
}

function isSellEvent(event: PortfolioEvent): event is PortfolioSellEvent {
  return event.kind === 'sell'
}

function isNonNegativeFinite(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0
}

function isValidRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

function isValidNav(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0
}

function roundMoney(value: number): number {
  return Math.round(value)
}

function roundUnits(value: number): number {
  return Math.round(value * 10000) / 10000
}

const UNIT_EPSILON = 1e-8
