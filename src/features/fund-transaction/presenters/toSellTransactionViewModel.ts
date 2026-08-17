import type {
  PortfolioFieldConfidence,
  PortfolioSellEvent,
  PortfolioValueSource,
} from '@/domains/portfolio/models/index.ts'
import type {
  PortfolioCalculation,
  PortfolioSellCalculation,
} from '@/domains/portfolio/services/calculatePortfolio.ts'

export interface SellTransactionFieldViewModel {
  readonly confidence: PortfolioFieldConfidence
  readonly confidenceText: string
  readonly sourceText: string
  readonly text: string
}

export interface SellTransactionViewModel {
  readonly costBasisAmount: SellTransactionFieldViewModel
  readonly confirmedDateText: string
  readonly entryMode: PortfolioSellEvent['entryMode']
  readonly expectedConfirmationDateText: string
  readonly grossAmount: SellTransactionFieldViewModel
  readonly id: string
  readonly navDateText: string
  readonly netAmount: SellTransactionFieldViewModel
  readonly realizedGain: SellTransactionFieldViewModel
  readonly realizedGainStatus: PortfolioSellCalculation['realizedGainStatus']
  readonly realizedGainStatusText: string
  readonly redemptionFee: SellTransactionFieldViewModel
  readonly requestedUnits: SellTransactionFieldViewModel
  readonly status: SellTransactionDisplayStatus
  readonly statusText: string
  readonly submittedAtText: string
  readonly unitNav: SellTransactionFieldViewModel
  readonly units: SellTransactionFieldViewModel
}

export type SellTransactionDisplayStatus = 'pending' | 'settled-nav-pending' | 'settled-nav-ready'

export interface SellTransactionIssueViewModel {
  readonly eventId: string
  readonly text: string
}

export function toSellTransactionViewModel(
  event: PortfolioSellEvent,
  calculation: PortfolioCalculation,
): SellTransactionViewModel {
  const calculated = calculation.sellEvents.find(({ eventId }) => eventId === event.id)
  const result = calculated ?? fallbackCalculation(event)
  const status = resolveStatus(result)

  return {
    costBasisAmount: toMoneyField(result.costBasisAmount),
    confirmedDateText: event.confirmedDate ?? '--',
    entryMode: event.entryMode,
    expectedConfirmationDateText: event.expectedConfirmationDate ?? '--',
    grossAmount: toMoneyField(result.grossAmount),
    id: event.id,
    navDateText: event.navDate,
    netAmount: toMoneyField(result.netAmount),
    realizedGain: toMoneyField(result.realizedGain),
    realizedGainStatus: result.realizedGainStatus,
    realizedGainStatusText: result.realizedGainStatus === 'complete' ? '收益完整' : '收益不完整',
    redemptionFee: toMoneyField(result.redemptionFee, true),
    requestedUnits: toUnitsField(result.requestedUnits),
    status,
    statusText: statusText(status),
    submittedAtText: event.submittedAt,
    unitNav: toNavField(result.unitNav),
    units: toUnitsField(result.units),
  }
}

export function toSellTransactionIssueViewModels(
  calculation: Pick<PortfolioCalculation, 'issues'>,
  fundCode: string,
): readonly SellTransactionIssueViewModel[] {
  return calculation.issues
    .filter(
      ({ code, fundCode: issueFundCode }) =>
        issueFundCode === fundCode &&
        (code === 'insufficient-units' || code === 'missing-sell-units'),
    )
    .map((issue) => {
      if (issue.code === 'insufficient-units') {
        return {
          eventId: issue.eventId,
          text: `份额不足：请求 ${formatUnits(issue.requestedUnits)} 份，可用 ${formatUnits(issue.availableUnits)} 份。`,
        }
      }
      return {
        eventId: issue.eventId,
        text: '卖出事实未能计算成本基础，请检查事件份额和结算状态。',
      }
    })
}

function toMoneyField(
  field: {
    readonly confidence: PortfolioFieldConfidence
    readonly source: PortfolioValueSource
    readonly value: number | null
  },
  hideEstimated = false,
): SellTransactionFieldViewModel {
  return {
    confidence: field.confidence,
    confidenceText: confidenceText(field.confidence),
    sourceText: sourceText(field.source),
    text:
      field.value === null || (hideEstimated && field.confidence === 'estimated')
        ? '--'
        : `¥${(field.value / 100).toFixed(2)}`,
  }
}

function toNavField(field: PortfolioSellCalculation['unitNav']): SellTransactionFieldViewModel {
  return {
    confidence: field.confidence,
    confidenceText: confidenceText(field.confidence),
    sourceText: sourceText(field.source),
    text: field.value === null ? '--' : field.value.toFixed(4),
  }
}

function toUnitsField(field: PortfolioSellCalculation['units']): SellTransactionFieldViewModel {
  return {
    confidence: field.confidence,
    confidenceText: confidenceText(field.confidence),
    sourceText: sourceText(field.source),
    text: field.value === null ? '--' : field.value.toFixed(4),
  }
}

function formatUnits(field: PortfolioSellCalculation['units']): string {
  return field.value === null ? '--' : field.value.toFixed(4)
}

function fallbackCalculation(event: PortfolioSellEvent): PortfolioSellCalculation {
  return {
    costBasisAmount: unknownField(),
    eventId: event.id,
    fundCode: event.fundCode,
    grossAmount: event.grossAmount,
    netAmount: event.netAmount,
    realizedGain: unknownField(),
    realizedGainStatus: 'incomplete',
    redemptionFee: event.redemptionFee,
    requestedUnits: event.requestedUnits,
    settlementStatus: event.settlementStatus,
    unitNav: event.unitNav,
    units: event.units,
  }
}

function resolveStatus(calculation: PortfolioSellCalculation): SellTransactionDisplayStatus {
  if (calculation.settlementStatus === 'pending-settlement') return 'pending'
  return calculation.unitNav.value === null ? 'settled-nav-pending' : 'settled-nav-ready'
}

function statusText(status: SellTransactionDisplayStatus): string {
  if (status === 'pending') return '待确认'
  if (status === 'settled-nav-pending') return '已确认，净值待补全'
  return '已确认，净值已获取'
}

function unknownField() {
  return { confidence: 'unknown', source: 'formula', value: null } as const
}

function confidenceText(confidence: PortfolioFieldConfidence): string {
  if (confidence === 'actual') return '实际'
  if (confidence === 'estimated') return '估算'
  return '未知'
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
