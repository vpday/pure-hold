import type { FundReconciliation } from '@/app/portfolio/portfolioCoordinator.ts'
import type {
  FieldValue,
  MoneyFieldValue,
  PortfolioEvent,
  PortfolioEventKind,
  PortfolioFieldConfidence,
  PortfolioValueSource,
} from '@/domains/portfolio/models/index.ts'
import type {
  PortfolioCalculation,
  PortfolioCalculationIssue,
  PortfolioSellCalculation,
} from '@/domains/portfolio/services/calculatePortfolio.ts'

export type LedgerRecordStatus = 'pending' | 'settled' | 'issue'
export type LedgerStatusTone = 'default' | 'success' | 'warning' | 'error'

export interface LedgerFieldViewModel {
  readonly confidenceText: string
  readonly sourceText: string
  readonly text: string
}

export interface LedgerRecordViewModel {
  readonly amount: LedgerFieldViewModel
  readonly amountLabel: string
  readonly canDelete: boolean
  readonly canEdit: boolean
  readonly confirmedDateText: string
  readonly costBasisAmount: LedgerFieldViewModel
  readonly costBasisLabel: string
  readonly dateText: string
  readonly expectedConfirmationDateText: string
  readonly fee: LedgerFieldViewModel
  readonly feeLabel: string
  readonly hasIssue: boolean
  readonly id: string
  readonly issueText: string
  readonly kind: PortfolioEventKind
  readonly kindText: string
  readonly navDateText: string
  readonly pending: boolean
  readonly realizedGain: LedgerFieldViewModel
  readonly realizedGainStatusText: string
  readonly reasonText: string
  readonly resultText: string
  readonly sourceText: string
  readonly status: LedgerRecordStatus
  readonly statusText: string
  readonly statusTone: LedgerStatusTone
  readonly submittedAtText: string
  readonly unitNav: LedgerFieldViewModel
  readonly units: LedgerFieldViewModel
}

export interface LedgerPositionViewModel {
  readonly averageCost: LedgerFieldViewModel
  readonly costAmount: LedgerFieldViewModel
  readonly units: LedgerFieldViewModel
}

export type LedgerComparisonStatus = 'consistent' | 'different' | 'insufficient-data'
export type LedgerComparisonTone = 'default' | 'success' | 'warning'

export interface LedgerDifferenceViewModel {
  readonly costAmount: LedgerFieldViewModel
  readonly directionText: string
  readonly status: LedgerComparisonStatus
  readonly statusText: string
  readonly statusTone: LedgerComparisonTone
  readonly units: LedgerFieldViewModel
}

export interface FundLedgerViewModel {
  readonly availability: FundReconciliation['availability']
  readonly availabilityText: string
  readonly difference: LedgerDifferenceViewModel
  readonly fundCode: string
  readonly fundHolding: LedgerPositionViewModel | null
  readonly initialEventLocked: boolean
  readonly ledgerEnabled: boolean
  readonly position: LedgerPositionViewModel | null
  readonly retryAvailable: boolean
}

interface OrderedLedgerRecord extends LedgerRecordViewModel {
  readonly orderDate: string
  readonly savedIndex: number
}

type LedgerCalculation =
  | PortfolioCalculation['events'][number]
  | PortfolioCalculation['sellEvents'][number]
  | PortfolioCalculation['cashDividendEvents'][number]
  | PortfolioCalculation['dividendReinvestmentEvents'][number]
  | PortfolioCalculation['adjustmentEvents'][number]

const kindText: Record<PortfolioEventKind, string> = {
  adjustment: '调仓',
  'cash-dividend': '现金分红',
  'dividend-reinvestment': '红利再投资',
  buy: '买入',
  'initial-holding': '期初持仓',
  sell: '卖出',
}

export function toLedgerRecordViewModels(
  events: readonly PortfolioEvent[],
  calculation: PortfolioCalculation,
  fundCode: string,
): readonly LedgerRecordViewModel[] {
  const issuesByEvent = groupIssuesByEvent(calculation.issues, fundCode)
  const records = events
    .map((event, savedIndex) => ({ event, savedIndex }))
    .filter(({ event }) => event.fundCode === fundCode)
    .map(({ event, savedIndex }) =>
      toLedgerRecordViewModel(event, savedIndex, calculation, issuesByEvent.get(event.id) ?? []),
    )

  return sortLedgerRecords(records)
}

export function sortLedgerRecords(
  records: readonly OrderedLedgerRecord[],
): readonly LedgerRecordViewModel[] {
  return [...records]
    .sort((left, right) => {
      if (left.pending !== right.pending) return left.pending ? -1 : 1
      return right.orderDate.localeCompare(left.orderDate) || right.savedIndex - left.savedIndex
    })
    .map(({ orderDate: _orderDate, savedIndex: _savedIndex, ...record }) => record)
}

export function toFundLedgerViewModel(reconciliation: FundReconciliation): FundLedgerViewModel {
  const position = reconciliation.ledger
    ? toPositionViewModel(reconciliation.ledger.units, reconciliation.ledger.costAmount)
    : null
  const fundHolding = reconciliation.fundHolding
    ? toPositionViewModel(
        valueField(reconciliation.fundHolding.units, 'actual', 'manual'),
        valueField(reconciliation.fundHolding.costAmountCents, 'actual', 'manual'),
      )
    : null
  const difference = toDifferenceViewModel(reconciliation)

  return {
    availability: reconciliation.availability,
    availabilityText: availabilityText(reconciliation.availability),
    difference,
    fundCode: reconciliation.fundCode,
    fundHolding,
    initialEventLocked: reconciliation.initialEventLocked,
    ledgerEnabled: reconciliation.ledgerEnabled,
    position,
    retryAvailable: reconciliation.availability === 'missing-ledger' && fundHolding !== null,
  }
}

function toLedgerRecordViewModel(
  event: PortfolioEvent,
  savedIndex: number,
  calculation: PortfolioCalculation,
  issues: readonly PortfolioCalculationIssue[],
): OrderedLedgerRecord {
  const calculated = findCalculation(event, calculation)
  const pending = isPending(event, calculated)
  const issueText = issues.map(formatIssue).join('；')
  const status: LedgerRecordStatus = issues.length ? 'issue' : pending ? 'pending' : 'settled'

  const base = {
    amount: emptyField(),
    amountLabel: '金额',
    canDelete: event.kind === 'buy' || event.kind === 'sell',
    canEdit: event.kind === 'buy' || event.kind === 'sell',
    confirmedDateText: 'confirmedDate' in event ? (event.confirmedDate ?? '--') : '--',
    costBasisAmount: emptyField(),
    costBasisLabel: '成本',
    dateText: eventDateText(event),
    expectedConfirmationDateText:
      'expectedConfirmationDate' in event ? (event.expectedConfirmationDate ?? '--') : '--',
    fee: emptyField(),
    feeLabel: '费用',
    hasIssue: issues.length > 0,
    id: event.id,
    issueText,
    kind: event.kind,
    kindText: kindText[event.kind],
    navDateText: 'navDate' in event ? event.navDate : '--',
    pending,
    realizedGain: emptyField(),
    realizedGainStatusText: '--',
    reasonText: 'reason' in event ? event.reason : '',
    resultText: resultText(event.kind),
    sourceText: eventSourceText(event.source),
    status,
    statusText: statusText(status, pending, event, calculated),
    statusTone: statusTone(status),
    submittedAtText: 'submittedAt' in event ? event.submittedAt : '--',
    unitNav: emptyField(),
    units: emptyField(),
    orderDate: eventDateText(event),
    savedIndex,
  }

  switch (event.kind) {
    case 'adjustment': {
      const result = calculated && 'unitsDelta' in calculated ? calculated : undefined
      return {
        ...base,
        amount: toMoneyField(result?.costAmountDelta ?? event.costAmountDelta, true),
        amountLabel: '成本变动',
        units: toUnitsField(result?.unitsDelta ?? event.unitsDelta, true),
      }
    }
    case 'cash-dividend': {
      const result = calculated && 'cashAmount' in calculated ? calculated : undefined
      return {
        ...base,
        amount: toMoneyField(result?.cashAmount ?? event.cashAmount),
        amountLabel: '现金分红',
      }
    }
    case 'dividend-reinvestment': {
      const result = calculated && 'dividendAmount' in calculated ? calculated : undefined
      const dividendAmount = result?.dividendAmount ?? event.dividendAmount
      return {
        ...base,
        amount: toMoneyField(dividendAmount),
        amountLabel: '再投资金额',
        costBasisAmount: toMoneyField(dividendAmount),
        costBasisLabel: '新增成本',
        unitNav: toNavField(result?.unitNav ?? event.unitNav),
        units: toUnitsField(result?.units ?? event.units),
      }
    }
    case 'initial-holding':
      return {
        ...base,
        amount: toMoneyField(event.costAmount),
        amountLabel: '期初成本',
        units: toUnitsField(event.units),
      }
    case 'buy': {
      const result = calculated && 'totalAmount' in calculated ? calculated : undefined
      return {
        ...base,
        amount: toMoneyField(result?.totalAmount ?? event.totalAmount),
        amountLabel: '买入金额',
        fee: toMoneyField(result?.purchaseFee ?? event.purchaseFee, true),
        feeLabel: '申购费',
        unitNav: toNavField(result?.unitNav ?? event.unitNav),
        units: toUnitsField(result?.units ?? event.units),
      }
    }
    case 'sell': {
      const result = calculated && 'netAmount' in calculated ? calculated : undefined
      const sellResult = result as PortfolioSellCalculation | undefined
      return {
        ...base,
        amount: toMoneyField(sellResult?.netAmount ?? event.netAmount),
        amountLabel: '卖出净额',
        costBasisAmount: toMoneyField(sellResult?.costBasisAmount ?? unknownField()),
        costBasisLabel: '移动平均成本',
        fee: toMoneyField(sellResult?.redemptionFee ?? event.redemptionFee, true),
        feeLabel: '赎回费',
        realizedGain: toMoneyField(sellResult?.realizedGain ?? unknownField(), true),
        realizedGainStatusText:
          sellResult?.realizedGainStatus === 'complete' ? '收益已计算' : '收益待补全',
        unitNav: toNavField(sellResult?.unitNav ?? event.unitNav),
        units: toUnitsField(sellResult?.units ?? event.units),
      }
    }
  }
}

function findCalculation(
  event: PortfolioEvent,
  calculation: PortfolioCalculation,
): LedgerCalculation | undefined {
  if (event.kind === 'buy') return calculation.events.find(({ eventId }) => eventId === event.id)
  if (event.kind === 'sell')
    return calculation.sellEvents.find(({ eventId }) => eventId === event.id)
  if (event.kind === 'cash-dividend') {
    return calculation.cashDividendEvents.find(({ eventId }) => eventId === event.id)
  }
  if (event.kind === 'dividend-reinvestment') {
    return calculation.dividendReinvestmentEvents.find(({ eventId }) => eventId === event.id)
  }
  if (event.kind === 'adjustment') {
    return calculation.adjustmentEvents.find(({ eventId }) => eventId === event.id)
  }
  return undefined
}

function isPending(event: PortfolioEvent, calculated: LedgerCalculation | undefined): boolean {
  if ((calculated?.settlementStatus ?? event.settlementStatus) === 'pending-settlement') return true
  if (event.kind !== 'buy' && event.kind !== 'sell') return false
  const unitNav =
    calculated !== undefined && 'unitNav' in calculated ? calculated.unitNav : event.unitNav
  return unitNav.value === null
}

function statusText(
  status: LedgerRecordStatus,
  pending: boolean,
  event: PortfolioEvent,
  calculated: LedgerCalculation | undefined,
): string {
  if (status === 'issue') return '存在校验问题'
  if (!pending) return '已确认'
  if (
    (event.kind === 'buy' || event.kind === 'sell') &&
    calculated !== undefined &&
    'unitNav' in calculated &&
    calculated.unitNav.value === null
  ) {
    return '已确认，净值待补全'
  }
  return '待确认或待补全'
}

function resultText(kind: PortfolioEventKind): string {
  if (kind === 'cash-dividend') return '计入现金分红'
  if (kind === 'dividend-reinvestment') return '计入持仓成本'
  if (kind === 'initial-holding') return '账本期初余额'
  if (kind === 'adjustment') return '按调仓事实应用'
  if (kind === 'buy') return '增加持仓成本'
  return '按平均成本计算收益'
}

function statusTone(status: LedgerRecordStatus): LedgerStatusTone {
  if (status === 'issue') return 'error'
  if (status === 'pending') return 'warning'
  return 'success'
}

function eventDateText(event: PortfolioEvent): string {
  if (event.kind === 'buy' || event.kind === 'sell') {
    return event.confirmedDate ?? event.expectedConfirmationDate ?? event.navDate
  }
  return event.confirmedDate
}

function groupIssuesByEvent(
  issues: readonly PortfolioCalculationIssue[],
  fundCode: string,
): Map<string, readonly PortfolioCalculationIssue[]> {
  const grouped = new Map<string, PortfolioCalculationIssue[]>()
  for (const issue of issues) {
    if (issue.fundCode !== fundCode) continue
    const current = grouped.get(issue.eventId) ?? []
    current.push(issue)
    grouped.set(issue.eventId, current)
  }
  return grouped
}

function formatIssue(issue: PortfolioCalculationIssue): string {
  if (issue.code === 'insufficient-units') {
    return `份额不足：请求 ${formatUnits(issue.requestedUnits)} 份，可用 ${formatUnits(issue.availableUnits)} 份`
  }
  if (issue.code === 'missing-sell-units') return '卖出份额未能确认，成本基础暂不可计算'
  if (issue.code === 'insufficient-adjustment-units') {
    return `调仓后份额将低于零：可用 ${formatUnits(issue.availableUnits)} 份`
  }
  if (issue.code === 'insufficient-adjustment-cost') {
    return `调仓后成本将低于零：可用 ${formatMoneyValue(issue.availableCostAmount)}`
  }
  return '调仓事实不完整，暂未应用'
}

function formatUnits(field: FieldValue<number>): string {
  return field.value === null ? '--' : field.value.toFixed(4)
}

function formatMoneyValue(field: MoneyFieldValue): string {
  return field.value === null ? '--' : `¥${(field.value / 100).toFixed(2)}`
}

function toDifferenceViewModel(reconciliation: FundReconciliation): LedgerDifferenceViewModel {
  const { costAmountCents, units } = reconciliation.difference
  const comparable =
    reconciliation.availability === 'available' &&
    reconciliation.fundHolding !== null &&
    reconciliation.ledger !== null &&
    costAmountCents !== null &&
    units !== null
  const status: LedgerComparisonStatus = !comparable
    ? 'insufficient-data'
    : costAmountCents === 0 && units === 0
      ? 'consistent'
      : 'different'

  return {
    costAmount: toDifferenceMoneyField(costAmountCents),
    directionText: '成交记录计算结果 − 当前持仓设置',
    status,
    statusText: comparisonStatusText(status),
    statusTone: comparisonStatusTone(status),
    units: toDifferenceUnitsField(units),
  }
}

function comparisonStatusText(status: LedgerComparisonStatus): string {
  if (status === 'consistent') return '一致'
  if (status === 'different') return '存在差异'
  return '信息不足'
}

function comparisonStatusTone(status: LedgerComparisonStatus): LedgerComparisonTone {
  if (status === 'consistent') return 'success'
  if (status === 'different') return 'warning'
  return 'default'
}

function toPositionViewModel(
  units: FieldValue<number>,
  costAmount: MoneyFieldValue,
): LedgerPositionViewModel {
  return {
    averageCost: toAverageCostField(costAmount, units),
    costAmount: toMoneyField(costAmount),
    units: toUnitsField(units),
  }
}

function toAverageCostField(
  costAmount: MoneyFieldValue,
  units: FieldValue<number>,
): LedgerFieldViewModel {
  if (costAmount.value === null || units.value === null || units.value <= 0) return emptyField()
  return {
    confidenceText: confidenceText(mergeConfidence(costAmount.confidence, units.confidence)),
    sourceText: sourceText('formula'),
    text: `¥${(costAmount.value / units.value / 100).toFixed(4)}`,
  }
}

function toMoneyField(field: MoneyFieldValue, signed = false): LedgerFieldViewModel {
  return {
    confidenceText: confidenceText(field.confidence),
    sourceText: sourceText(field.source),
    text: formatMoney(field.value, signed),
  }
}

function toUnitsField(field: FieldValue<number>, signed = false): LedgerFieldViewModel {
  return {
    confidenceText: confidenceText(field.confidence),
    sourceText: sourceText(field.source),
    text: formatUnitsValue(field.value, signed),
  }
}

function toNavField(field: FieldValue<number>): LedgerFieldViewModel {
  return {
    confidenceText: confidenceText(field.confidence),
    sourceText: sourceText(field.source),
    text: field.value === null ? '--' : field.value.toFixed(4),
  }
}

function toDifferenceMoneyField(value: number | null): LedgerFieldViewModel {
  return toMoneyField(valueField(value, value === null ? 'unknown' : 'estimated', 'formula'), true)
}

function toDifferenceUnitsField(value: number | null): LedgerFieldViewModel {
  return toUnitsField(valueField(value, value === null ? 'unknown' : 'estimated', 'formula'), true)
}

function emptyField(): LedgerFieldViewModel {
  return { confidenceText: '未知', sourceText: '--', text: '--' }
}

function emptyFieldValue(): FieldValue<number> {
  return { confidence: 'unknown', source: 'formula', value: null }
}

function unknownField(): MoneyFieldValue {
  return emptyFieldValue()
}

function valueField(
  value: number | null,
  confidence: PortfolioFieldConfidence,
  source: PortfolioValueSource,
): FieldValue<number> {
  return { confidence, source, value }
}

function formatMoney(value: number | null, signed: boolean): string {
  if (value === null) return '--'
  const absolute = `¥${(Math.abs(value) / 100).toFixed(2)}`
  if (!signed || value === 0) return absolute
  return value > 0 ? `+${absolute}` : `-${absolute}`
}

function formatUnitsValue(value: number | null, signed: boolean): string {
  if (value === null) return '--'
  const absolute = Math.abs(value).toFixed(4)
  if (!signed || value === 0) return absolute
  return value > 0 ? `+${absolute}` : `-${absolute}`
}

function confidenceText(confidence: PortfolioFieldConfidence): string {
  if (confidence === 'actual') return '实际'
  if (confidence === 'estimated') return '估算'
  return '未知'
}

function sourceText(source: PortfolioValueSource): string {
  if (source === 'fund-basic-info') return '基金基础资料'
  if (source === 'formula') return '本地计算'
  if (source === 'manual') return '手工录入'
  if (source === 'migration') return '初始持仓'
  if (source === 'nav-history') return '历史净值'
  return '平台实际值'
}

function eventSourceText(source: PortfolioEvent['source']): string {
  if (source === 'initial-holding') return '自动建账'
  if (source === 'dividend-reinvestment') return '系统事件'
  if (source === 'adjustment') return '调仓事件'
  return '手工记录'
}

function mergeConfidence(
  left: PortfolioFieldConfidence,
  right: PortfolioFieldConfidence,
): PortfolioFieldConfidence {
  if (left === 'unknown' || right === 'unknown') return 'unknown'
  if (left === 'actual' && right === 'actual') return 'actual'
  return 'estimated'
}

function availabilityText(availability: FundReconciliation['availability']): string {
  if (availability === 'available') return '账本已建立'
  if (availability === 'missing-ledger') return '账本自动建立未完成'
  if (availability === 'missing-fund-holding') return '尚未录入当前持仓'
  if (availability === 'incomplete') return '账本数据待补全'
  return '基金不存在'
}
