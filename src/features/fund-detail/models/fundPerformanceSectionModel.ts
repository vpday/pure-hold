import type {
  FundPerformancePanelDescriptor,
  FundPerformancePanelModel,
} from './fundPerformancePanel'
import type { FundPerformanceView } from './fundPerformanceView'

export interface FundPerformanceSectionModel {
  readonly activeView: FundPerformanceView
  readonly descriptors: readonly FundPerformancePanelDescriptor[]
  readonly panels: readonly FundPerformancePanelModel[]
}
