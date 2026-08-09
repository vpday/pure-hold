import type { FundPerformancePanelModel } from './fundPerformancePanel'
import type { FundPerformanceView } from './fundPerformanceView'

export interface FundPerformanceSectionModel {
  readonly activeView: FundPerformanceView
  readonly isVisible: boolean
  readonly panels: readonly FundPerformancePanelModel[]
}
