import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange'
import type { FundNetValueHistory } from '@/domains/funds/models/fundNetValueHistory'

export type FundNetValueView = 'cumulative-net-value' | 'unit-net-value'

export interface FundNetValueChartModel {
  readonly dailyGrowthPercents: readonly (number | null)[]
  readonly dates: readonly string[]
  readonly name: string
  readonly values: readonly (number | null)[]
}

export type LoadFundNetValueHistory = (
  fundCode: string,
  range: FundHistoryRange,
  signal?: AbortSignal,
) => Promise<FundNetValueHistory>
