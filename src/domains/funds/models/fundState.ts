import type { FundGroupDefinition } from './fundGroupDefinition.ts'
import type { FundSnapshot } from './fundSnapshot.ts'

export interface FundState {
  readonly fundOrder: readonly string[]
  readonly groups: readonly FundGroupDefinition[]
  readonly snapshotsByCode: Readonly<Record<string, FundSnapshot>>
}
