import type { FundGroupDefinition } from './fundGroupDefinition.ts'
import type { FundHolding } from './fundHolding.ts'
import type { FundSnapshot } from './fundSnapshot.ts'

export interface FundState {
  readonly fundOrder: readonly string[]
  readonly groups: readonly FundGroupDefinition[]
  readonly holdingsByCode: Readonly<Record<string, FundHolding>>
  readonly snapshotsByCode: Readonly<Record<string, FundSnapshot>>
}
