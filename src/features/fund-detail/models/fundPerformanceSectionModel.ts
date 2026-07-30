import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'

import type {
  FundCumulativeReturnsChartModel,
  FundReferenceIndexOption,
} from './fundCumulativeReturnsChart'
import type { FundNetValueChartModel } from './fundNetValueChart'
import type { FundPerformanceView } from './fundPerformanceView'

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

export interface FundPerformanceSectionModel {
  readonly activeView: FundPerformanceView
  readonly cumulativeNetValue: FundNetValuePanelModel
  readonly cumulativeReturns: FundCumulativeReturnsPanelModel
  readonly isVisible: boolean
  readonly unitNetValue: FundNetValuePanelModel
}
