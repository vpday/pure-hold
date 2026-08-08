import type { FundGroupDefinition } from './fundGroupDefinition.ts'
import type { FundHolding } from './fundHolding.ts'

export interface FundSetting {
  readonly code: string
  readonly name: string
}

export interface FundSettings {
  readonly funds: readonly FundSetting[]
  readonly groups: readonly FundGroupDefinition[]
  readonly holdingOrder: readonly string[]
  readonly holdingsByCode: Readonly<Record<string, FundHolding>>
}
