import type {
  FundLedgerState,
  PortfolioCoordinationStatus,
} from '@/app/portfolio/portfolioCoordinator.ts'
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
  readonly sourceVisible: boolean
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
  readonly id: string
  readonly kind: PortfolioEventKind
  readonly kindText: string
  readonly navDateText: string
  readonly pending: boolean
  readonly reasonText: string
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

export interface FundLedgerViewModel {
  readonly canCorrect: boolean
  readonly canRecord: boolean
  readonly fundCode: string
  readonly hasPartialPersistence: boolean
  readonly position: LedgerPositionViewModel | null
  readonly retryAvailable: boolean
  readonly status: PortfolioCoordinationStatus
  readonly statusText: string
  readonly statusTone: LedgerStatusTone
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
  adjustment: '手工修正',
  'cash-dividend': '现金分红',
  'dividend-reinvestment': '红利再投资',
  buy: '买入',
  'initial-holding': '初始持仓',
  sell: '卖出',
}

export function toLedgerRecordViewModels(
  events: readonly PortfolioEvent[],
  calculation: PortfolioCalculation | undefined,
  fundCode: string,
): readonly LedgerRecordViewModel[] {
  const issuesByEvent = groupIssuesByEvent(calculation?.issues ?? [], fundCode)
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

export function toFundLedgerViewModel(state: FundLedgerState): FundLedgerViewModel {
  return {
    canCorrect: state.canCorrect,
    canRecord: state.canRecord,
    fundCode: state.fundCode,
    hasPartialPersistence: state.failure?.persistence === 'partial',
    position: state.ledger
      ? toPositionViewModel(state.ledger.units, state.ledger.costAmount)
      : null,
    retryAvailable: state.retryable,
    status: state.status,
    statusText: coordinationStatusText(state.status),
    statusTone: coordinationStatusTone(state.status),
  }
}

function toLedgerRecordViewModel(
  event: PortfolioEvent,
  savedIndex: number,
  calculation: PortfolioCalculation | undefined,
  issues: readonly PortfolioCalculationIssue[],
): OrderedLedgerRecord {
  const calculated = findCalculation(event, calculation)
  const pending = isPending(event, calculated)
  const status: LedgerRecordStatus = issues.length ? 'issue' : pending ? 'pending' : 'settled'

  const base = {
    amount: emptyField(),
    amountLabel: '',
    canDelete: event.kind === 'buy' || event.kind === 'sell',
    canEdit: event.kind === 'buy' || event.kind === 'sell',
    confirmedDateText: 'confirmedDate' in event ? (event.confirmedDate ?? '--') : '--',
    costBasisAmount: emptyField(),
    costBasisLabel: '',
    dateText: eventDateText(event),
    expectedConfirmationDateText:
      'expectedConfirmationDate' in event ? (event.expectedConfirmationDate ?? '--') : '--',
    fee: emptyField(),
    feeLabel: '',
    id: event.id,
    kind: event.kind,
    kindText: kindText[event.kind],
    navDateText: 'navDate' in event ? event.navDate : '--',
    pending,
    reasonText: 'reason' in event ? event.reason : '',
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
      const result = calculated && 'targetUnits' in calculated ? calculated : undefined
      const targetUnits = result?.targetUnits ?? event.targetUnits
      return {
        ...base,
        amount: toMoneyField(result?.targetCostAmount ?? event.targetCostAmount),
        amountLabel: '目标成本',
        units: toUnitsField(targetUnits, false, shouldShowSourceText(event.source, targetUnits)),
      }
    }
    case 'cash-dividend': {
      const result = calculated && 'cashAmount' in calculated ? calculated : undefined
      return {
        ...base,
        amount: toMoneyField(result?.cashAmount ?? event.cashAmount),
      }
    }
    case 'dividend-reinvestment': {
      const result = calculated && 'dividendAmount' in calculated ? calculated : undefined
      const dividendAmount = result?.dividendAmount ?? event.dividendAmount
      const unitNav = result?.unitNav ?? event.unitNav
      const units = result?.units ?? event.units
      return {
        ...base,
        amount: toMoneyField(dividendAmount),
        costBasisAmount: toMoneyField(dividendAmount),
        unitNav: toNavField(unitNav, shouldShowSourceText(event.source, unitNav)),
        units: toUnitsField(units, false, shouldShowSourceText(event.source, units)),
      }
    }
    case 'initial-holding':
      return {
        ...base,
        amount: toMoneyField(event.costAmount),
        units: toUnitsField(event.units, false, shouldShowSourceText(event.source, event.units)),
      }
    case 'buy': {
      const result = calculated && 'totalAmount' in calculated ? calculated : undefined
      const purchaseFee = result?.purchaseFee ?? event.purchaseFee
      const unitNav = result?.unitNav ?? event.unitNav
      const units = result?.units ?? event.units
      return {
        ...base,
        amount: toMoneyField(result?.totalAmount ?? event.totalAmount),
        fee: toMoneyField(purchaseFee, true, shouldShowSourceText(event.source, purchaseFee)),
        unitNav: toNavField(unitNav, shouldShowSourceText(event.source, unitNav)),
        units: toUnitsField(units, false, shouldShowSourceText(event.source, units)),
      }
    }
    case 'sell': {
      const result = calculated && 'netAmount' in calculated ? calculated : undefined
      const sellResult = result as PortfolioSellCalculation | undefined
      const fee = sellResult?.redemptionFee ?? event.redemptionFee
      const unitNav = sellResult?.unitNav ?? event.unitNav
      const units = sellResult?.units ?? event.units
      return {
        ...base,
        amount: toMoneyField(sellResult?.netAmount ?? event.netAmount),
        amountLabel: '净额',
        costBasisAmount: toMoneyField(sellResult?.costBasisAmount ?? unknownField()),
        costBasisLabel: '移动平均成本',
        fee: toMoneyField(fee, true, shouldShowSourceText(event.source, fee)),
        unitNav: toNavField(unitNav, shouldShowSourceText(event.source, unitNav)),
        units: toUnitsField(units, false, shouldShowSourceText(event.source, units)),
      }
    }
  }
}

function findCalculation(
  event: PortfolioEvent,
  calculation: PortfolioCalculation | undefined,
): LedgerCalculation | undefined {
  if (calculation === undefined) return undefined
  if (event.kind === 'buy') return calculation.events.find(({ eventId }) => eventId === event.id)
  if (event.kind === 'sell')
    return calculation.sellEvents.find(({ eventId }) => eventId === event.id)
  if (event.kind === 'cash-dividend') {
    return calculation.cashDividendEvents.find(({ eventId }) => eventId === event.id)
  }
  if (event.kind === 'dividend-reinvestment') {
    return calculation.dividendReinvestmentEvents.find(({ eventId }) => eventId === event.id)
  }
  return calculation.adjustmentEvents.find(({ eventId }) => eventId === event.id)
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
  if (status === 'issue') return '账本异常'
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

function shouldShowSourceText(
  eventSource: PortfolioEvent['source'],
  field: FieldValue<number>,
): boolean {
  return eventSource !== 'manual' || field.source !== 'manual' || field.confidence !== 'actual'
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
    sourceVisible: true,
    sourceText: sourceText('formula'),
    text: `¥${formatDecimal(costAmount.value / units.value / 100, 6)}`,
  }
}

function toMoneyField(
  field: MoneyFieldValue,
  signed = false,
  sourceVisible = true,
): LedgerFieldViewModel {
  return {
    confidenceText: confidenceText(field.confidence),
    sourceVisible,
    sourceText: sourceText(field.source),
    text: formatMoney(field.value, signed),
  }
}

function toUnitsField(
  field: FieldValue<number>,
  signed = false,
  sourceVisible = true,
): LedgerFieldViewModel {
  return {
    confidenceText: confidenceText(field.confidence),
    sourceVisible,
    sourceText: sourceText(field.source),
    text: formatUnitsValue(field.value, signed),
  }
}

function toNavField(field: FieldValue<number>, sourceVisible = true): LedgerFieldViewModel {
  return {
    confidenceText: confidenceText(field.confidence),
    sourceVisible,
    sourceText: sourceText(field.source),
    text: field.value === null ? '--' : formatDecimal(field.value, 4),
  }
}

function emptyField(): LedgerFieldViewModel {
  return { confidenceText: '未知', sourceVisible: false, sourceText: '--', text: '--' }
}

function emptyFieldValue(): FieldValue<number> {
  return { confidence: 'unknown', source: 'formula', value: null }
}

function unknownField(): MoneyFieldValue {
  return emptyFieldValue()
}

function formatMoney(value: number | null, signed: boolean): string {
  if (value === null) return '--'
  const absolute = `¥${Math.abs(value / 100).toFixed(2)}`
  if (!signed || value === 0) return absolute
  return value > 0 ? `+${absolute}` : `-${absolute}`
}

function formatUnitsValue(value: number | null, signed: boolean): string {
  if (value === null) return '--'
  const absolute = formatDecimal(Math.abs(value), 4)
  if (!signed || value === 0) return absolute
  return value > 0 ? `+${absolute}` : `-${absolute}`
}

function formatDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')
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
  if (source === 'initial-holding') return ''
  if (source === 'dividend-reinvestment') return '系统事件'
  if (source === 'adjustment') return '手工修正'
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

function coordinationStatusText(status: PortfolioCoordinationStatus): string {
  if (status === 'synced') return '已同步'
  if (status === 'pending-confirmation') return '待确认'
  if (status === 'pending-exact-data') return '待精确数据'
  if (status === 'ledger-error') return '账本异常'
  if (status === 'portfolio-persistence-failed') return '账本记录保存失败'
  return '持仓同步失败'
}

function coordinationStatusTone(status: PortfolioCoordinationStatus): LedgerStatusTone {
  if (status === 'synced') return 'success'
  if (status === 'ledger-error' || status === 'portfolio-persistence-failed') return 'error'
  if (status === 'holding-sync-failed') return 'error'
  return 'warning'
}
