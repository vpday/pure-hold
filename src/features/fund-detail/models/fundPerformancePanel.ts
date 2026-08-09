import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'

import type {
  FundCumulativeReturnsChartModel,
  FundReferenceIndexOption,
} from './fundCumulativeReturnsChart'
import type { FundCumulativeExcessReturnChartModel } from './fundCumulativeExcessReturnChart'
import type { FundDistributionTableModel } from './fundDistributionTableModel'
import type { FundDrawdownRange } from './fundDrawdownComparison'
import type { FundDrawdownComparisonChartModel } from './fundDrawdownComparisonChart'
import type { FundNetValueChartModel } from './fundNetValueChart'
import type { FundPerformanceView } from './fundPerformanceView'
import type { FundRollingExcessRange } from './fundRollingExcessReturn'
import type { FundRollingExcessReturnChartModel } from './fundRollingExcessReturnChart'

export type FundPerformancePanelId = FundPerformanceView | 'distribution'

export type FundPerformancePanelRendererKey =
  | 'cumulative-returns'
  | 'cumulative-excess-return'
  | 'drawdown-comparison'
  | 'net-value'
  | 'rolling-excess-return'
  | 'distribution'

export type FundPerformanceRangeByView = {
  readonly 'cumulative-returns': FundHistoryRange
  readonly 'cumulative-excess-return': FundHistoryRange
  readonly 'drawdown-comparison': FundDrawdownRange
  readonly 'net-value': FundHistoryRange
  readonly 'reinvested-net-value': FundHistoryRange
  readonly 'rolling-excess-return': FundRollingExcessRange
}

export type FundPerformanceSelectRangeAction = {
  [TView in FundPerformanceView]: {
    readonly type: 'select-range'
    readonly view: TView
    readonly range: FundPerformanceRangeByView[TView]
  }
}[FundPerformanceView]

export type FundPerformanceAction =
  | { readonly type: 'select-view'; readonly view: FundPerformanceView }
  | FundPerformanceSelectRangeAction
  | { readonly type: 'select-reference-index'; readonly code: string }
  | { readonly type: 'activate-panel'; readonly panelId: FundPerformancePanelId }
  | { readonly type: 'retry-panel'; readonly panelId: FundPerformancePanelId }

interface FundChartPanelModel<TId extends FundPerformanceView, TChart> {
  readonly id: TId
  readonly kind: 'chart'
  readonly chart?: TChart
  readonly error: string
  readonly isLoading: boolean
}

export interface FundCumulativeReturnsPanelModel extends FundChartPanelModel<
  'cumulative-returns',
  FundCumulativeReturnsChartModel
> {
  readonly referenceIndexOptions: readonly FundReferenceIndexOption[]
  readonly selectedRange: FundHistoryRange
  readonly selectedReferenceIndexCode: string
}

export interface FundCumulativeExcessReturnPanelModel extends FundChartPanelModel<
  'cumulative-excess-return',
  FundCumulativeExcessReturnChartModel
> {
  readonly selectedRange: FundHistoryRange
  readonly warning: string
}

export interface FundDrawdownComparisonPanelModel extends FundChartPanelModel<
  'drawdown-comparison',
  FundDrawdownComparisonChartModel
> {
  readonly selectedRange: FundDrawdownRange
  readonly warning: string
}

export interface FundNetValuePanelModel extends FundChartPanelModel<
  'net-value',
  FundNetValueChartModel
> {
  readonly selectedRange: FundHistoryRange
}

export interface FundReinvestedNetValuePanelModel extends FundChartPanelModel<
  'reinvested-net-value',
  FundNetValueChartModel
> {
  readonly selectedRange: FundHistoryRange
  readonly warning: string
}

export interface FundRollingExcessReturnPanelModel extends FundChartPanelModel<
  'rolling-excess-return',
  FundRollingExcessReturnChartModel
> {
  readonly selectedRange: FundRollingExcessRange
  readonly warning: string
}

export interface FundDistributionPanelModel extends FundDistributionTableModel {
  readonly id: 'distribution'
  readonly kind: 'distribution'
  readonly error: string
  readonly hasLoaded: boolean
  readonly isLoading: boolean
}

export type FundPerformancePanelModel =
  | FundCumulativeReturnsPanelModel
  | FundCumulativeExcessReturnPanelModel
  | FundDrawdownComparisonPanelModel
  | FundNetValuePanelModel
  | FundReinvestedNetValuePanelModel
  | FundRollingExcessReturnPanelModel
  | FundDistributionPanelModel
