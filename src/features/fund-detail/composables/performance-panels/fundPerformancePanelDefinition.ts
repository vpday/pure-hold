import type { ComputedRef } from 'vue'

import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo.ts'
import type {
  FundPerformancePanelActionFor,
  FundPerformancePanelDescriptor,
  FundPerformancePanelId,
  FundPerformancePanelModel,
} from '../../models/fundPerformancePanel.ts'

export interface FundPerformancePanelDefinition<TId extends FundPerformancePanelId> {
  readonly descriptor: FundPerformancePanelDescriptor<TId>
  readonly model: ComputedRef<Extract<FundPerformancePanelModel, { readonly id: TId }>>
  activate(): Promise<void>
  close(): void
  dispatch(action: FundPerformancePanelActionFor<TId>): Promise<void>
  open(fundCode: string): void
  refresh(): Promise<void>
  retry(): Promise<void>
  updateBasicInfo?(fundCode: string, value: FundBasicInfo): Promise<void>
}

export type AnyFundPerformancePanelDefinition = {
  [TId in FundPerformancePanelId]: FundPerformancePanelDefinition<TId>
}[FundPerformancePanelId]

export function resolveFundPerformancePanelDefinition<TId extends FundPerformancePanelId>(
  definitions: readonly AnyFundPerformancePanelDefinition[],
  id: TId,
): FundPerformancePanelDefinition<TId> {
  const definition = definitions.find(({ descriptor }) => descriptor.id === id)
  if (!definition) throw new Error(`Missing fund performance panel definition: ${id}`)
  return definition as unknown as FundPerformancePanelDefinition<TId>
}
