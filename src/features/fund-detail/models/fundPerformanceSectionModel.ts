import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'

import type {
  FundCumulativeReturnsChartModel,
  FundReferenceIndexOption,
} from './fundCumulativeReturnsChart'
import type { FundDistributionTableModel } from './fundDistributionTableModel'
import type { FundNetValueChartModel } from './fundNetValueChart'
import type { FundPerformanceView } from './fundPerformanceView'
import type { FundRelativeBenchmarkChartModel } from './fundRelativeBenchmarkChart'

interface FundChartState<T> {
  readonly chart?: T
  readonly error: string
  readonly isLoading: boolean
}

interface FundCumulativeReturnsPanelModel extends FundChartState<FundCumulativeReturnsChartModel> {
  readonly referenceIndexOptions: readonly FundReferenceIndexOption[]
  readonly selectedRange: FundHistoryRange
  readonly selectedReferenceIndexCode: string
}

interface FundNetValuePanelModel extends FundChartState<FundNetValueChartModel> {
  readonly selectedRange: FundHistoryRange
}

interface FundReinvestedNavPanelModel extends FundNetValuePanelModel {
  readonly warning: string
}

interface FundRelativeBenchmarkPanelModel extends FundChartState<FundRelativeBenchmarkChartModel> {
  readonly selectedRange: FundHistoryRange
  readonly warning: string
}

interface FundDistributionPanelModel extends FundDistributionTableModel {
  readonly error: string
  readonly hasLoaded: boolean
  readonly isLoading: boolean
}

export interface FundPerformanceSectionModel {
  readonly activeView: FundPerformanceView
  readonly cumulativeReturns: FundCumulativeReturnsPanelModel
  readonly distribution: FundDistributionPanelModel
  readonly isVisible: boolean
  readonly netValue: FundNetValuePanelModel
  readonly reinvestedNetValue: FundReinvestedNavPanelModel
  readonly relativeBenchmark: FundRelativeBenchmarkPanelModel
}
