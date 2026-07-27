import type { FundHolding } from './fundHolding.ts'

export interface FundAddition {
  readonly code: string
  readonly holding?: FundHolding
  readonly name: string
}
