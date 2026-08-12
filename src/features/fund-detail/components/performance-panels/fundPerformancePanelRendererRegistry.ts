import type { Component } from 'vue'

import type { FundPerformancePanelId } from '../../models/fundPerformancePanel'
import FundCumulativeExcessReturnPanelRenderer from './FundCumulativeExcessReturnPanelRenderer.vue'
import FundCumulativeReturnsPanelRenderer from './FundCumulativeReturnsPanelRenderer.vue'
import FundDistributionPanelRenderer from './FundDistributionPanelRenderer.vue'
import FundDrawdownComparisonPanelRenderer from './FundDrawdownComparisonPanelRenderer.vue'
import FundNetValuePanelRenderer from './FundNetValuePanelRenderer.vue'
import FundRollingExcessReturnPanelRenderer from './FundRollingExcessReturnPanelRenderer.vue'

export const fundPerformancePanelRendererRegistry = {
  'cumulative-excess-return': FundCumulativeExcessReturnPanelRenderer,
  'cumulative-returns': FundCumulativeReturnsPanelRenderer,
  distribution: FundDistributionPanelRenderer,
  'drawdown-comparison': FundDrawdownComparisonPanelRenderer,
  'net-value': FundNetValuePanelRenderer,
  'reinvested-net-value': FundNetValuePanelRenderer,
  'rolling-excess-return': FundRollingExcessReturnPanelRenderer,
} satisfies Record<FundPerformancePanelId, Component>

export function resolveFundPerformancePanelRenderer(id: FundPerformancePanelId): Component {
  return fundPerformancePanelRendererRegistry[id]
}
